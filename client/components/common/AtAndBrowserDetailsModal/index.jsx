import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Form, Alert } from 'react-bootstrap';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faInfoCircle,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { useDetectUa } from '../../../hooks/useDetectUa';
import BasicModal from '../BasicModal';

const ModalInnerSectionContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const FieldsetRow = styled.fieldset`
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 1rem;
`;

const ModalSubtitleStyle = styled.h2`
    font-size: 0.8em;
    margin: 0;
    padding: 0;
`;

const AtAndBrowserDetailsModal = ({
    show = false,
    isAdmin = false,
    firstLoad = true,
    atName = '',
    atVersion = '',
    atVersions = [],
    browserName = '',
    browserVersion = '',
    browserVersions = [],
    patternName = '', // admin related prop
    testerName = '', // admin related prop
    handleAction = () => {},
    handleClose = () => {}
}) => {
    // Detect UA information
    const { uaBrowser, uaMajor, uaMinor, uaPatch } = useDetectUa();
    const updatedAtVersionDropdownRef = useRef();
    const adminFreeTextBrowserVersionRef = useRef();

    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [updatedAtVersion, setUpdatedAtVersion] = useState(
        'Select a Version'
    );
    const [updatedBrowserVersion, setUpdatedBrowserVersion] = useState('');
    const [freeTextBrowserVersion, setFreeTextBrowserVersion] = useState('');
    const [updatedBrowserVersions, setUpdatedBrowserVersions] = useState(
        browserVersions
    );

    const [isAtVersionError, setIsAtVersionError] = useState(false);
    const [
        isAdminFreeTextBrowserVersionError,
        setIsAdminFreeTextBrowserVersionError
    ] = useState(false);

    const [
        forceBrowserVersionUpdateMessage,
        setForceBrowserVersionUpdateMessage
    ] = useState(false);
    const [
        browserVersionMismatchMessage,
        setBrowserVersionMismatchMessage
    ] = useState(false);

    useEffect(() => {
        setIsFirstLoad(firstLoad);
        if (!firstLoad) {
            setUpdatedAtVersion(atVersion);
            setUpdatedBrowserVersion(browserVersion);
        }

        if (uaMajor === '0') setUpdatedBrowserVersion('Not detected');

        // needs to check if browser version exists in browserVersions
        let matchingBrowserVersion = browserVersions.find(item =>
            item.includes(`${uaMajor}.${uaMinor}.${uaPatch}`)
        );

        if (
            !matchingBrowserVersion &&
            uaBrowser === browserName &&
            uaMajor &&
            uaMajor !== '0'
        ) {
            matchingBrowserVersion = `${uaMajor}.${uaMinor}.${uaPatch}`;
            setUpdatedBrowserVersions([
                matchingBrowserVersion,
                ...updatedBrowserVersions
            ]);
        }

        if (
            // don't force browserVersion update with admin (unless first run)
            (!isAdmin || (isAdmin && firstLoad)) &&
            // check that saved browserVersion is the same as detected
            !browserVersion.includes(`${uaMajor}.${uaMinor}.${uaPatch}`) &&
            uaBrowser === browserName &&
            matchingBrowserVersion
        ) {
            setForceBrowserVersionUpdateMessage(true);
            setUpdatedBrowserVersion(matchingBrowserVersion);
        }
    }, [uaBrowser, uaMajor, uaMinor, uaPatch]);

    useEffect(() => {
        // check to support Tester Scenario 5
        if (!updatedBrowserVersion.includes(`${uaMajor}.${uaMinor}.${uaPatch}`))
            setBrowserVersionMismatchMessage(true);
        else setBrowserVersionMismatchMessage(!isAdmin && false);
    }, [updatedBrowserVersion, uaMajor, uaMinor, uaPatch]);

    const handleAtVersionChange = e => {
        const value = e.target.value;
        setUpdatedAtVersion(value);
        setIsAtVersionError(false);
    };

    const handleBrowserVersionChange = (e, setFreeTextBrowserVersion) => {
        const value = e.target.value;

        if (setFreeTextBrowserVersion) setFreeTextBrowserVersion(value);
        else setUpdatedBrowserVersion(value);

        // remove message once browser has been changed
        !isAdmin && setForceBrowserVersionUpdateMessage(false);
        setIsAdminFreeTextBrowserVersionError(false);
    };

    const onSubmit = () => {
        // Passed action prop should account for AtVersion & BrowserVersion
        const updatedAtVersionError = updatedAtVersion === 'Select a Version';
        const adminBrowserVersionTextError = isAdmin && !updatedBrowserVersion;

        if (updatedAtVersionError || adminBrowserVersionTextError) {
            setIsAtVersionError(updatedAtVersionError);
            updatedAtVersionDropdownRef.current.focus();

            setIsAdminFreeTextBrowserVersionError(adminBrowserVersionTextError);
            if (!updatedAtVersionError)
                adminFreeTextBrowserVersionRef.current.focus();
            return;
        }

        handleAction(
            updatedAtVersion,
            uaMajor === '0' && !isAdmin
                ? freeTextBrowserVersion
                : updatedBrowserVersion
        );
    };

    // All scenarios here are based on https://github.com/w3c/aria-at-app/issues/406
    return (
        <BasicModal
            show={show}
            closeButton={false}
            headerSep={false}
            title="Assistive Technology and Browser Details"
            dialogClassName="modal-60w"
            content={
                <ModalInnerSectionContainer>
                    {/* Admin Scenario 1 */}
                    {isAdmin && (
                        <Alert
                            variant="warning"
                            className="at-browser-details-modal-alert"
                        >
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>
                                You are about to review <b>{patternName}</b> as{' '}
                                <b>{testerName}</b>. Your Assistive Technology
                                and Browser might be different. Please proceed
                                with caution.
                            </span>
                        </Alert>
                    )}
                    Your Assistive Technology and Browser Details are the
                    following. Please make sure this information is still
                    accurate.
                    <br />
                    <br />
                    <FieldsetRow>
                        <legend>
                            <ModalSubtitleStyle>
                                Assistive Technology Details
                            </ModalSubtitleStyle>
                        </legend>
                        {/* Tester Scenario 6 */}
                        {!isFirstLoad && !updatedAtVersion.includes(atVersion) && (
                            <Alert
                                variant="warning"
                                className="at-browser-details-modal-alert"
                            >
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                <span>
                                    The version of {atName} you have selected is
                                    different from the one previously selected,
                                    which was <b>{atVersion}</b>.
                                    <br />
                                    <br />
                                    This change doesn&apos;t affect results that
                                    have already been submitted for this plan.
                                    However, results you submit during this
                                    session will be recorded with the versions
                                    specified in this form.
                                </span>
                            </Alert>
                        )}
                        <Form.Group>
                            <Form.Label>Assistive Technology Name</Form.Label>
                            <Form.Control disabled type="text" value={atName} />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>
                                Assistive Technology Version
                            </Form.Label>
                            <Form.Control
                                ref={updatedAtVersionDropdownRef}
                                as="select"
                                value={updatedAtVersion}
                                onChange={handleAtVersionChange}
                                isInvalid={isAtVersionError}
                            >
                                {['Select a Version', ...atVersions].map(
                                    item => (
                                        <option
                                            key={`atVersionKey-${item}`}
                                            value={item}
                                            disabled={
                                                item === 'Select a Version'
                                            }
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </Form.Control>
                            {isAtVersionError && (
                                <Form.Control.Feedback
                                    style={{ display: 'block' }}
                                    type="invalid"
                                >
                                    Please select an Assistive Technology
                                    Version.
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>
                    </FieldsetRow>
                    <FieldsetRow>
                        <legend>
                            <ModalSubtitleStyle>
                                Browser Details
                            </ModalSubtitleStyle>
                        </legend>
                        {/* Tester Scenario 1 */}
                        {isFirstLoad && (
                            <Alert
                                variant="primary"
                                className="at-browser-details-modal-alert"
                            >
                                <FontAwesomeIcon icon={faInfoCircle} />
                                <span>
                                    We have automatically detected your version
                                    of {uaBrowser}
                                </span>
                            </Alert>
                        )}
                        {/* Tester Scenario 3 */}
                        {!isFirstLoad &&
                            !isAdmin &&
                            forceBrowserVersionUpdateMessage && (
                                <Alert
                                    variant="warning"
                                    className="at-browser-details-modal-alert"
                                >
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                    />
                                    <span>
                                        We have automatically detected you are
                                        using a different version of{' '}
                                        <b>{uaBrowser}</b> and we have updated
                                        it below. The previous version you were
                                        using was <b>{browserVersion}</b>.
                                        <br />
                                        <br />
                                        This change doesn&apos;t affect results
                                        that have already been submitted for
                                        this plan. However, results you submit
                                        during this session will be recorded
                                        with the versions specified in this
                                        form.
                                    </span>
                                </Alert>
                            )}
                        {/* Tester Scenario 4 */}
                        {!isAdmin &&
                            uaBrowser !== browserName &&
                            uaMajor !== '0' && (
                                <Alert
                                    variant="warning"
                                    className="at-browser-details-modal-alert"
                                >
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                    />
                                    <span>
                                        We have automatically detected you are
                                        now using{' '}
                                        <b>
                                            {uaBrowser} {uaMajor}.{uaMinor}.
                                            {uaPatch}
                                        </b>{' '}
                                        which is a different browser from the
                                        last one you were testing with, which
                                        was{' '}
                                        <b>
                                            {browserName} {browserVersion}
                                        </b>
                                        .
                                        <br />
                                        <br />
                                        You can&apos;t edit your Browser type,
                                        but you can continue with{' '}
                                        <b>
                                            {uaBrowser} {uaMajor}.{uaMinor}.
                                            {uaPatch}
                                        </b>
                                        . Keep in mind that your test results
                                        will be recorded as if you were still
                                        using{' '}
                                        <b>
                                            {browserName} {browserVersion}
                                        </b>
                                        .
                                    </span>
                                </Alert>
                            )}
                        {/* Tester Scenario 5 */}
                        {!isAdmin &&
                            uaBrowser === browserName &&
                            browserVersionMismatchMessage && (
                                <Alert
                                    variant="warning"
                                    className="at-browser-details-modal-alert"
                                >
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                    />
                                    <span>
                                        The version of {browserName} you have
                                        selected is different from the one we
                                        have automatically detected, which is{' '}
                                        <b>
                                            {uaMajor}.{uaMinor}.{uaPatch}
                                        </b>
                                        .
                                        <br />
                                        <br />
                                        This change doesn&apos;t affect results
                                        that have already been submitted for
                                        this plan. However, results you submit
                                        during this session will be recorded
                                        with the versions specified in this
                                        form.
                                    </span>
                                </Alert>
                            )}
                        {/* Tester Scenario 7 */}
                        {uaMajor === '0' && (
                            <Alert
                                variant="warning"
                                className="at-browser-details-modal-alert"
                            >
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                <span>
                                    We could not automatically detect what
                                    version of <b>{browserName}</b> you are
                                    using. Before continuing, please provide
                                    your version number.
                                </span>
                            </Alert>
                        )}
                        {/* Admin Scenario 1 */}
                        {isAdmin &&
                            (uaBrowser !== browserName ||
                                browserVersionMismatchMessage) && (
                                <Alert
                                    variant="warning"
                                    className="at-browser-details-modal-alert"
                                >
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                    />
                                    <span>
                                        We have automatically detected you are
                                        using{' '}
                                        <b>
                                            {uaBrowser} {uaMajor}.{uaMinor}.
                                            {uaPatch}
                                        </b>
                                        . This version is different than what{' '}
                                        <b>{testerName}</b> was using last time,
                                        which was{' '}
                                        <b>
                                            {browserName} {browserVersion}
                                        </b>
                                        .
                                        <br />
                                        <br />
                                        We have not updated this information
                                        below. Please proceed with caution.
                                    </span>
                                </Alert>
                            )}
                        <Form.Group>
                            <Form.Label>Browser Name</Form.Label>
                            <Form.Control
                                disabled
                                type="text"
                                value={browserName}
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Browser Version</Form.Label>
                            {isAdmin ? (
                                <>
                                    <Form.Control
                                        ref={adminFreeTextBrowserVersionRef}
                                        type="text"
                                        value={updatedBrowserVersion}
                                        onChange={handleBrowserVersionChange}
                                        isInvalid={
                                            isAdminFreeTextBrowserVersionError
                                        }
                                    />
                                    {isAdminFreeTextBrowserVersionError && (
                                        <Form.Control.Feedback
                                            style={{ display: 'block' }}
                                            type="invalid"
                                        >
                                            Please enter a valid Browser
                                            Version.
                                        </Form.Control.Feedback>
                                    )}
                                </>
                            ) : (
                                <Form.Control
                                    as="select"
                                    disabled={uaMajor === '0'}
                                    value={updatedBrowserVersion}
                                    onChange={handleBrowserVersionChange}
                                >
                                    {(uaMajor === '0'
                                        ? [
                                              'Not detected',
                                              ...updatedBrowserVersions
                                          ]
                                        : updatedBrowserVersions
                                    ).map(item => (
                                        <option
                                            key={`browserVersionKey-${item}`}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    ))}
                                </Form.Control>
                            )}
                        </Form.Group>

                        {/* Tester Scenario 7 */}
                        {uaMajor === '0' && (
                            <Form.Group className="at-browser-details-full-column">
                                <Form.Label>Enter Browser Version</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={freeTextBrowserVersion}
                                    onChange={e =>
                                        handleBrowserVersionChange(
                                            e,
                                            setFreeTextBrowserVersion
                                        )
                                    }
                                />
                            </Form.Group>
                        )}
                    </FieldsetRow>
                </ModalInnerSectionContainer>
            }
            actionLabel={'Save and Continue'}
            handleAction={onSubmit}
            handleClose={handleClose}
        />
    );
};

AtAndBrowserDetailsModal.propTypes = {
    show: PropTypes.bool,
    isAdmin: PropTypes.bool,
    firstLoad: PropTypes.bool,
    atName: PropTypes.string,
    atVersion: PropTypes.string,
    atVersions: PropTypes.arrayOf(PropTypes.string),
    browserName: PropTypes.string,
    browserVersion: PropTypes.string,
    browserVersions: PropTypes.arrayOf(PropTypes.string),
    patternName: PropTypes.string,
    testerName: PropTypes.string,
    handleClose: PropTypes.func,
    handleAction: PropTypes.func
};

export default AtAndBrowserDetailsModal;
