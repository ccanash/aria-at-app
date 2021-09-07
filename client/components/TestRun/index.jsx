import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { Link, useParams, useHistory } from 'react-router-dom';
import useRouterQuery from '../../hooks/useRouterQuery';
import { useQuery, useMutation } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRedo,
    faExclamationCircle,
    faCheck,
    faPen
} from '@fortawesome/free-solid-svg-icons';
import nextId from 'react-id-generator';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';
import TestNavigator from './TestNavigator';
import RaiseIssueModal from '../RaiseIssueModal';
import ReviewConflictsModal from './ReviewConflictsModal';
import StatusBar from './StatusBar';
import TestRenderer from '../TestRenderer';
import OptionButton from './OptionButton';
import PageStatus from '../common/PageStatus';
import BasicModal from '../common/BasicModal';
import { getTestPlanRunIssuesForTest } from '../../network';
import { evaluateAtNameKey, buildTestPageUri } from '../../utils/aria';
import {
    TEST_RUN_PAGE_QUERY,
    UPDATE_TEST_RUN_RESULT_MUTATION,
    CLEAR_TEST_RESULT_MUTATION
} from './queries';
import './TestRun.css';
import supportJson from '../../resources/support.json';

const TestRun = ({ auth }) => {
    const params = useParams();
    const history = useHistory();
    const routerQuery = useRouterQuery();
    const titleRef = useRef();
    const testRunStateRef = useRef();
    const testRunResultRef = useRef();
    const testRendererSubmitButtonRef = useRef();

    const { runId: testPlanRunId } = params;

    const { loading, data, error, refetch } = useQuery(TEST_RUN_PAGE_QUERY, {
        variables: { testPlanRunId }
    });
    const [updateTestRunResult] = useMutation(UPDATE_TEST_RUN_RESULT_MUTATION);
    const [clearTestResult] = useMutation(CLEAR_TEST_RESULT_MUTATION);

    const [pageReady, setPageReady] = useState(false);
    const [isTestSubmitClicked, setIsTestSubmitClicked] = useState(false);
    const [showTestNavigator, setShowTestNavigator] = useState(true);
    const [currentTestIndex, setCurrentTestIndex] = useState(1);
    const [issues, setIssues] = useState([]);
    const [showStartOverModal, setShowStartOverModal] = useState(false);
    const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);
    const [showReviewConflictsModal, setShowReviewConflictsModal] = useState(
        false
    );

    useEffect(() => {
        if (data && !pageReady) {
            // get structured UNCLOSED issue data from GitHub for current test
            (async () => {
                try {
                    const currentTestIndex =
                        data.testPlanRun.testResults[0].index;
                    const issues = await getTestPlanRunIssuesForTest(
                        testPlanRunId,
                        currentTestIndex
                    );
                    setIssues(issues.filter(({ closed }) => !closed));
                    setCurrentTestIndex(currentTestIndex);
                } catch (error) {
                    console.error('load.issues.error', error);
                }
                setPageReady(true);
            })();
        }
    }, [data, currentTestIndex]);

    useEffect(() => {
        testRunStateRef.current = null;
        testRunResultRef.current = null;
        setIsTestSubmitClicked(false);

        if (titleRef.current) titleRef.current.focus();
    }, [currentTestIndex]);

    if (error) {
        const { message } = error;
        return (
            <PageStatus
                title="Error - Test Results | ARIA-AT"
                heading="Testing Task"
                message={message}
                isError
            />
        );
    }

    if (!pageReady || !data || loading) {
        return (
            <PageStatus
                title="Loading - Test Results | ARIA-AT"
                heading="Testing Task"
            />
        );
    }

    const { testPlanRun, users } = data;
    const { testPlanReport, tester } = testPlanRun || {};
    const { testPlanTarget, testPlanVersion, conflicts } = testPlanReport || {};

    const { id: userId } = auth;
    // check to ensure an admin that manually went to a test run url doesn't
    // run the test as themselves
    const openAsUserId =
        routerQuery.get('user') || (tester && tester.id !== userId)
            ? tester.id
            : null;
    const testerId = openAsUserId || userId;

    if (!testPlanRun || !testPlanTarget) {
        return (
            <PageStatus
                title="Error - Test Results | ARIA-AT"
                heading="Testing Task"
                message="Unavailable"
                isError
            />
        );
    }

    const testResults = testPlanRun.testResults.map((testResult, index) => ({
        ...testResult,
        seq: index + 1
    }));
    const currentTest = testResults.find(t => t.index === currentTestIndex);
    const hasTestsToRun = testResults.length;

    const toggleTestNavigator = () => setShowTestNavigator(!showTestNavigator);

    const navigateTests = (previous = false) => {
        // assume navigation forward if previous is false
        let newTestIndex = currentTest.seq;
        if (!previous) {
            // next
            const newTestIndexToEval = currentTest.seq + 1;
            if (newTestIndexToEval <= testResults.length)
                newTestIndex = newTestIndexToEval;
        } else {
            // previous
            const newTestIndexToEval = currentTest.seq - 1;
            if (
                newTestIndexToEval >= 1 &&
                newTestIndexToEval <= testResults.length
            )
                newTestIndex = newTestIndexToEval;
        }
        setCurrentTestIndex(
            testResults.find(t => t.seq === newTestIndex).index
        );
    };

    const performButtonAction = async (action, index) => {
        const saveForm = async (withResult = false) => {
            await handleUpdateTestPlanRunResultAction(
                withResult
                    ? {
                          state: testRunStateRef.current,
                          result: testRunResultRef.current
                      }
                    : {
                          state: testRunStateRef.current
                      }
            );
            if (withResult) return !!testRunResultRef.current;
            return true;
        };

        switch (action) {
            case 'goToTestAtIndex': {
                // Save renderer's form state
                await saveForm();
                setCurrentTestIndex(index);
                break;
            }
            case 'goToNextTest': {
                // Save renderer's form state
                await saveForm();
                navigateTests();
                break;
            }
            case 'goToPreviousTest': {
                // Save renderer's form state
                await saveForm();
                navigateTests(true);
                break;
            }
            case 'editTest': {
                await handleUpdateTestPlanRunResultAction({
                    result: null
                });
                if (titleRef.current) titleRef.current.focus();
                break;
            }
            case 'saveTest': {
                if (testRendererSubmitButtonRef.current) {
                    testRendererSubmitButtonRef.current.click();
                    setIsTestSubmitClicked(true);

                    // check to see if form was successfully submitted, if so, return to top of summary document
                    const forceFocusOnSave = await saveForm(true);
                    if (forceFocusOnSave)
                        if (titleRef.current) titleRef.current.focus();
                }
                break;
            }
            case 'closeTest': {
                // Save renderer's form state
                await saveForm();
                history.push('/test-queue');
                break;
            }
        }
    };

    const handleTestClick = async index =>
        await performButtonAction('goToTestAtIndex', index);

    const handleSaveClick = async () => performButtonAction('saveTest');

    const handleNextTestClick = async () => performButtonAction('goToNextTest');

    const handlePreviousTestClick = async () =>
        performButtonAction('goToPreviousTest');

    const handleCloseRunClick = async () => performButtonAction('closeTest');

    const handleEditClick = async () => performButtonAction('editTest');

    const handleRaiseIssueButtonClick = async () => {
        setShowRaiseIssueModal(!showRaiseIssueModal);
        setShowReviewConflictsModal(false);
    };

    const handleStartOverButtonClick = async () => setShowStartOverModal(true);

    const handleStartOverAction = async () => {
        await clearTestResult({
            variables: {
                testPlanRunId,
                index: currentTestIndex
            }
        });
        await refetch();

        // close modal after action
        setShowStartOverModal(false);
    };

    const handleUpdateTestPlanRunResultAction = async ({
        result,
        state,
        issues
    }) => {
        let variables = {
            // required
            testPlanRunId,
            index: currentTestIndex,

            // optionals
            result,
            issues
        };
        if (state) variables = { ...variables, state };

        await updateTestRunResult({ variables });
        // await refetch();
    };

    const handleReviewConflictsButtonClick = async () =>
        setShowReviewConflictsModal(true);

    const renderTestContent = (testPlanReport, testResult, heading) => {
        const { isComplete, index, result, state } = testResult;
        const isFirstTest = index === 1;
        const isLastTest = currentTest.seq === testResults.length;

        let primaryButtons = []; // These are the list of buttons that will appear below the tests
        let forwardButtons = []; // These are buttons that navigate to next tests and continue

        const nextButton = (
            <Button
                key="nextButton"
                variant="secondary"
                onClick={handleNextTestClick}
            >
                Next Test
            </Button>
        );

        const previousButton = (
            <Button
                key="previousButton"
                variant="secondary"
                onClick={handlePreviousTestClick}
                className="testrun__button-right"
                disabled={isFirstTest}
            >
                Previous Test
            </Button>
        );

        if (isComplete) {
            const editButton = (
                <Button
                    key="editButton"
                    className="edit-results"
                    variant="secondary"
                    onClick={handleEditClick}
                >
                    <FontAwesomeIcon icon={faPen} />
                    Edit Results
                </Button>
            );

            const continueButton = (
                <Button
                    key="continueButton"
                    variant="primary"
                    disabled={isLastTest}
                    onClick={handleNextTestClick}
                >
                    Continue
                </Button>
            );

            if (!isLastTest) forwardButtons = [nextButton];
            primaryButtons = [
                previousButton,
                editButton,
                ...forwardButtons,
                continueButton
            ];
        } else {
            // same key to maintain focus
            const saveResultsButton = (
                <Button
                    key="continueButton"
                    variant="primary"
                    onClick={handleSaveClick}
                >
                    Submit Results
                </Button>
            );
            if (!isLastTest) forwardButtons = [nextButton];
            primaryButtons = [
                previousButton,
                ...forwardButtons,
                saveResultsButton
            ];
        }

        const primaryButtonGroup = (
            <div className="testrun__button-toolbar-group">
                {primaryButtons}
            </div>
        );

        const menuRightOfContent = (
            <div role="complementary">
                <h3>Test Options</h3>
                <div className="options-wrapper">
                    <OptionButton
                        text="Raise An Issue"
                        icon={<FontAwesomeIcon icon={faExclamationCircle} />}
                        onClick={handleRaiseIssueButtonClick}
                    />

                    <OptionButton
                        text="Start Over"
                        disabled={!result && !state}
                        icon={<FontAwesomeIcon icon={faRedo} />}
                        onClick={handleStartOverButtonClick}
                    />

                    <OptionButton
                        text="Save and Close"
                        onClick={handleCloseRunClick}
                    />

                    <div className="help-link">
                        Need Help?{' '}
                        <a href="mailto:public-aria-at@w3.org">Email Us</a>
                    </div>
                </div>
            </div>
        );

        return (
            <>
                <h1 ref={titleRef} data-test="testing-task" tabIndex={-1}>
                    <span className="task-label">Testing task:</span>{' '}
                    {`${currentTest.seq}.`} {testResult.title}
                </h1>
                <span>{heading}</span>
                <StatusBar
                    key={nextId()}
                    issues={issues}
                    conflicts={conflicts[currentTestIndex]}
                    handleReviewConflictsButtonClick={
                        handleReviewConflictsButtonClick
                    }
                    handleRaiseIssueButtonClick={handleRaiseIssueButtonClick}
                />
                <Row>
                    <Col className="test-iframe-container" md={9}>
                        <Row>
                            <TestRenderer
                                key={nextId()}
                                test={currentTest}
                                support={supportJson}
                                testPageUri={buildTestPageUri(
                                    testPlanVersion.gitSha,
                                    testPlanVersion.directory,
                                    testPlanVersion.testReferencePath
                                )}
                                configQueryParams={[
                                    [
                                        'at',
                                        evaluateAtNameKey(
                                            testPlanTarget.at.name
                                        )
                                    ]
                                ]} // Array.from(new URL(document.location).searchParams)
                                testRunStateRef={testRunStateRef}
                                testRunResultRef={testRunResultRef}
                                submitButtonRef={testRendererSubmitButtonRef}
                                isSubmitted={isTestSubmitClicked}
                            />
                        </Row>
                        <Row>{primaryButtonGroup}</Row>
                    </Col>
                    <Col className="current-test-options" md={3}>
                        {menuRightOfContent}
                    </Col>
                </Row>

                {/* Modals */}
                {showStartOverModal && (
                    <BasicModal
                        key={`BasicModal__${currentTestIndex}`}
                        show={showStartOverModal}
                        centered={true}
                        animation={false}
                        details={{
                            title: 'Start Over',
                            description: `Are you sure you want to start over Test #${currentTest.seq}? Your progress (if any), will be lost.`
                        }}
                        handleAction={handleStartOverAction}
                        handleClose={() => setShowStartOverModal(false)}
                    />
                )}
                {showRaiseIssueModal && (
                    <RaiseIssueModal
                        key={`RaiseIssueModal__${currentTestIndex}`}
                        show={showRaiseIssueModal}
                        userId={testerId}
                        test={currentTest}
                        testPlanRun={testPlanRun}
                        issues={issues}
                        conflicts={conflicts[currentTestIndex]}
                        handleUpdateTestPlanRunResultAction={
                            handleUpdateTestPlanRunResultAction
                        }
                        handleClose={() => setShowRaiseIssueModal(false)}
                    />
                )}
                {showReviewConflictsModal && (
                    <ReviewConflictsModal
                        key={`ReviewConflictsModal__${currentTestIndex}`}
                        show={showReviewConflictsModal}
                        userId={testerId}
                        conflicts={conflicts[currentTestIndex]}
                        handleClose={() => setShowReviewConflictsModal(false)}
                        handleRaiseIssueButtonClick={
                            handleRaiseIssueButtonClick
                        }
                    />
                )}
            </>
        );
    };

    let heading;
    let content;
    let openAsUserHeading = null;

    if (openAsUserId) {
        const openAsUser = users.find(user => user.id === openAsUserId);
        openAsUserHeading = (
            <>
                <div className="test-info-entity reviewing-as">
                    Reviewing tests of <b>{`${openAsUser.username}`}.</b>
                    <p>{`All changes will be saved as performed by ${openAsUser.username}.`}</p>
                </div>
            </>
        );
    }

    heading = (
        <>
            <div className="test-info-wrapper">
                <div
                    className="test-info-entity apg-example-name"
                    data-test="apg-example-name"
                >
                    <div className="info-label">
                        <b>Test Plan:</b>{' '}
                        {`${testPlanVersion.title ||
                            testPlanVersion.directory}`}
                    </div>
                </div>
                <div
                    className="test-info-entity at-browser"
                    data-test="at-browser"
                >
                    <div className="info-label">
                        <b>AT and Browser:</b> {`${testPlanTarget.title}`}
                    </div>
                </div>
                <div className="test-info-entity tests-completed">
                    <div className="info-label">
                        <FontAwesomeIcon
                            icon={hasTestsToRun ? faCheck : faExclamationCircle}
                        />
                        {hasTestsToRun ? (
                            <>
                                {' '}
                                <b>{`${testPlanRun.testResultCount} of ${testResults.length}`}</b>{' '}
                                tests completed
                            </>
                        ) : (
                            <div>
                                No tests for this AT and Browser combination
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {openAsUserHeading}
        </>
    );

    if (!testPlanRun.isComplete) {
        content = hasTestsToRun ? (
            renderTestContent(
                testPlanReport,
                testResults.find(t => t.index === currentTestIndex),
                heading
            )
        ) : (
            // No tests loaded
            <>
                {heading}
                <div>No tests for this At and Browser combination</div>
            </>
        );
    } else {
        content = (
            <div>
                {heading}
                <Row>
                    <Alert key={nextId()} variant="success">
                        <FontAwesomeIcon icon={faCheck} /> Thanks! Your results
                        have been submitted. Please return to the{' '}
                        <Link to="/test-queue">Test Queue</Link>.
                    </Alert>
                </Row>
            </div>
        );
    }

    return (
        <Container className="test-run-container">
            <Helmet>
                <title>{testPlanTarget.title}</title>
            </Helmet>
            <Row>
                <TestNavigator
                    show={showTestNavigator}
                    testResults={testResults}
                    conflicts={conflicts}
                    currentTestIndex={currentTestIndex}
                    toggleShowClick={toggleTestNavigator}
                    handleTestClick={handleTestClick}
                />
                <Col className="main-test-area" as="main">
                    <Row>
                        <Col>{content}</Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
};

TestRun.propTypes = {
    auth: PropTypes.object
};

const mapStateToProps = state => {
    const { auth } = state;
    return { auth };
};

export default connect(mapStateToProps)(TestRun);
