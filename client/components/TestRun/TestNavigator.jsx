import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAlignLeft,
    faArrowLeft,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { Col } from 'react-bootstrap';
import React from 'react';

const TestNavigator = ({
    show = true,
    testResults = [],
    conflicts = {},
    currentTestIndex = 1,
    toggleShowClick = () => {},
    handleTestClick = () => {}
}) => {
    return (
        <Col className="test-navigator" md={show ? 3 : 12}>
            {show && <h2>Test Navigator</h2>}
            <div className="test-navigator-toggle-container">
                <button
                    onClick={toggleShowClick}
                    className={`test-navigator-toggle ${
                        show ? 'hide' : 'show'
                    }`}
                >
                    {show ? (
                        <FontAwesomeIcon icon={faArrowLeft} />
                    ) : (
                        <FontAwesomeIcon icon={faArrowRight} />
                    )}
                    <FontAwesomeIcon icon={faAlignLeft} />
                </button>
            </div>
            {show && (
                <nav role="complementary">
                    <ol className="test-navigator-list">
                        {testResults.map((testResult, index) => {
                            let resultClassName = 'not-started';
                            let resultStatus = 'Not Started:';

                            const testConflicts =
                                conflicts[testResult.index] || [];

                            if (testResult) {
                                if (testResult.isSkipped) {
                                    resultClassName = 'in-progress';
                                    resultStatus = 'In Progress:';
                                } else if (testConflicts.length) {
                                    resultClassName = 'conflicts';
                                    resultStatus = 'Has Conflicts:';
                                } else if (testResult.isComplete) {
                                    resultClassName = 'complete';
                                    resultStatus = 'Complete Test:';
                                }
                            }

                            return (
                                <li
                                    className={`test-name-wrapper ${resultClassName}`}
                                    key={`TestNavigatorItem_${index}`}
                                >
                                    <a
                                        href="#"
                                        onClick={async () =>
                                            await handleTestClick(index + 1)
                                        }
                                        className="test-name"
                                        aria-label={`${resultStatus} ${testResult.title}`}
                                        aria-current={
                                            testResult.index ===
                                            currentTestIndex
                                        }
                                    >
                                        {testResult.title}
                                    </a>
                                    <span
                                        className="progress-indicator"
                                        title={`${resultStatus}`}
                                    />
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}
        </Col>
    );
};

TestNavigator.propTypes = {
    show: PropTypes.bool,
    testResults: PropTypes.array,
    conflicts: PropTypes.object,
    currentTestIndex: PropTypes.number,
    toggleShowClick: PropTypes.func,
    handleTestClick: PropTypes.func
};

export default TestNavigator;
