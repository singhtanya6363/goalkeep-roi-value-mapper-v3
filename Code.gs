/**
 * Goalkeep ROI Mapper — Website Backend V2
 *
 * SETUP
 * 1. Create a new standalone Apps Script project.
 * 2. Paste this entire file into Code.gs.
 * 3. Run createGoalkeepROIWebsiteSystemV2() once and authorise it.
 * 4. Open the response workbook URL from the execution log.
 * 5. Deploy as a Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 * 6. Paste the /exec URL into index.html as SHEET_URL.
 */

const SYSTEM_NAME = 'Goalkeep ROI Mapper — Website V2';
const DEFAULT_DEADWEIGHT = 0.20;

const SHEET_NAMES = {
  CLIENTS: '1. Client Index',
  RATINGS: '2. Rating',
  BASELINE: '3. Baseline',
  ENDLINE: '4. Endline',
  OTHER: '5. Other Metrics',
  RAW: '6. Raw Submissions',
  CATALOGUE: '7. Question Catalogue'
};

const ROI_AREAS = [
  'Financial ROI',
  'Efficiency ROI',
  'Decision-making ROI',
  'Capacity Building & Data Culture ROI'
];

const ATTRIBUTION_MAP = {
  'Low contribution — 0% to 24%': 0.12,
  'Medium contribution — 25% to 49%': 0.37,
  'High contribution — 50% to 74%': 0.62,
  'Very high contribution — 75% to 100%': 0.875
};

const RATING_QUESTIONS = [
  {
    id: 'R01', area: 'Financial ROI',
    baseline: 'How strongly are data outputs, reports, dashboards, or evidence currently supporting funding conversations?',
    endline: 'How strongly are Goalkeep-supported outputs now supporting funding conversations?',
    captures: 'Funds raised / funding influenced'
  },
  {
    id: 'R02', area: 'Efficiency ROI',
    baseline: 'How easy is it currently for teams to access the data or reports they need without depending on another person or team?',
    endline: 'How easy is it now for teams to access the data or reports they need without depending on another person or team?',
    captures: 'Direct access to data'
  },
  {
    id: 'R03', area: 'Efficiency ROI',
    baseline: 'How efficient is the current reporting or data preparation process?',
    endline: 'How efficient is the reporting or data preparation process now?',
    captures: 'Time taken for reporting'
  },
  {
    id: 'R04', area: 'Efficiency ROI',
    baseline: 'How standardised is the current process for collecting, tracking, or reporting data?',
    endline: 'How standardised is the process for collecting, tracking, or reporting data now?',
    captures: 'Number of trackers used'
  },
  {
    id: 'R05', area: 'Decision-making ROI',
    baseline: 'How regularly is data currently used for planning, review, or decision-making?',
    endline: 'How regularly is data now used for planning, review, or decision-making?',
    captures: 'Use of data in decisions'
  },
  {
    id: 'R06', area: 'Decision-making ROI',
    baseline: 'How clearly can the team currently see progress against targets, indicators, or gaps?',
    endline: 'How clearly can the team now see progress against targets, indicators, or gaps?',
    captures: 'Programme outcome achievement'
  },
  {
    id: 'R07', area: 'Decision-making ROI',
    baseline: 'How useful are current data outputs for donor, leadership, or partner communication?',
    endline: 'How useful are Goalkeep-supported outputs now for donor, leadership, or partner communication?',
    captures: 'Donor / leadership communication'
  },
  {
    id: 'R08', area: 'Capacity Building & Data Culture ROI',
    baseline: 'How confident is the team currently in using data systems, dashboards, or data processes independently?',
    endline: 'How confident is the team now in using data systems, dashboards, or data processes independently?',
    captures: 'Staff capability / confidence'
  },
  {
    id: 'R09', area: 'Capacity Building & Data Culture ROI',
    baseline: 'How independently can the team currently create, adapt, or replicate data tools, dashboards, templates, or methods?',
    endline: 'How independently can the team now create, adapt, or replicate Goalkeep-supported tools, dashboards, templates, or methods?',
    captures: 'Internal replication of Goalkeep methods'
  }
];

/**
 * Metric rules:
 * - baselineEnabled false = not shown at Baseline.
 * - endlineOnly true = shown only at Endline and does not use retrospective baseline.
 * - direction higher_better / lower_better controls the improvement calculation.
 * - allowNA enables a Not applicable response.
 */
const METRICS = [
  {
    id: 'M01', area: 'Financial ROI', label: 'Funds raised', type: 'currency',
    units: ['₹'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: false, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: ₹5,00,000 was raised through proposals or funding conversations supported by the organisation’s data or evidence.'
  },
  {
    id: 'M02', area: 'Financial ROI', label: 'Budget growth', type: 'currency',
    units: ['₹'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: false, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: The programme budget increased from ₹20 lakh to ₹25 lakh.'
  },
  {
    id: 'M03', area: 'Efficiency ROI', label: 'Number of data requests', type: 'number',
    units: ['Requests/month', 'Requests/quarter'], direction: 'lower_better', directionText: 'A decrease generally represents improvement.',
    askMonetisation: true, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: The MEL/data team receives around 20 data requests per month.'
  },
  {
    id: 'M04', area: 'Efficiency ROI', label: 'Time taken for reporting', type: 'number',
    units: ['Hours/report', 'Hours/month'], direction: 'lower_better', directionText: 'A decrease generally represents improvement.',
    askMonetisation: true, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: A monthly report takes around 20 hours to prepare.'
  },
  {
    id: 'M05', area: 'Efficiency ROI', label: 'Number of trackers used', type: 'number',
    units: ['Trackers'], direction: 'lower_better', directionText: 'A decrease generally represents improvement.',
    askMonetisation: true, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: The team uses 20 different trackers or Google Sheets to manage programme data.'
  },
  {
    id: 'M06', area: 'Efficiency ROI', label: 'Number of users who have direct access to data', type: 'number',
    units: ['Users'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: true, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: 3 team members can directly access the dashboard or data without asking another team.'
  },
  {
    id: 'M07', area: 'Decision-making ROI', label: 'Percentage of programme team members who use data to make decisions', type: 'number',
    units: ['%'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: false, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: Around 40% of the programme team refers to data before planning or review decisions.'
  },
  {
    id: 'M09', area: 'Decision-making ROI', label: 'Percentage of programme outcome target achieved', type: 'number',
    units: ['%'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: false, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: The programme has achieved 45% of its planned learning or service-delivery target.'
  },
  {
    id: 'M11', area: 'Capacity Building & Data Culture ROI', label: 'Staff trained to use data', type: 'number',
    units: ['Staff'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: true, baselineEnabled: true, endlineEnabled: true,
    example: 'Example: 25 staff members have been trained to read dashboards, interpret data, or use data in reviews.'
  },
  {
    id: 'M12', area: 'Capacity Building & Data Culture ROI', label: 'Continued use of training materials', type: 'qualitative',
    units: [], direction: 'qualitative', directionText: 'Look for continued or expanded use after the engagement.',
    askMonetisation: false, baselineEnabled: false, endlineEnabled: true, endlineOnly: true,
    example: 'Example: Teams continue to use the worksheets, templates, or learning materials during reviews or onboarding.'
  },
  {
    id: 'M13', area: 'Capacity Building & Data Culture ROI', label: 'Internal replication of Goalkeep methods', type: 'number',
    units: ['Replications', 'Adaptations'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: true, baselineEnabled: false, endlineEnabled: true, endlineOnly: true,
    example: 'Example: The organisation adapted or replicated the method for 3 additional programmes or teams.'
  },
  {
    id: 'M14', area: 'Capacity Building & Data Culture ROI', label: 'Dashboard adoption', type: 'number',
    units: ['Active users/week'], direction: 'higher_better', directionText: 'An increase generally represents improvement.',
    askMonetisation: false, baselineEnabled: true, endlineEnabled: true, allowNA: true,
    example: 'Example: Around 15 team members actively use the dashboard each week.'
  }
];

const CLIENT_HEADERS = [
  'Engagement ID', 'Organisation', 'Engagement / Project',
  'Baseline Respondent Name', 'Baseline Email', 'Baseline Date', 'Baseline Submitted At',
  'Endline Respondent Name', 'Endline Email', 'Endline Date', 'Endline Submitted At',
  'Status', 'Baseline Response ID', 'Endline Response ID'
];

const RATING_HEADERS = [
  'Engagement ID', 'Organisation', 'Engagement / Project', 'Rating ID', 'ROI Area', 'What This Captures',
  'Baseline Question', 'Baseline Rating / 5', 'Baseline Rating Reason',
  'Endline Question', 'Endline Rating / 5', 'Endline Rating Reason', 'Rating Change',
  'Baseline Submitted At', 'Endline Submitted At'
];

const BASELINE_HEADERS = [
  'Engagement ID', 'Organisation', 'Engagement / Project', 'Metric ID', 'ROI Area', 'Metric',
  'Metric Response Status', 'Baseline Value', 'Baseline Unit', 'Exact / Estimated',
  'Comments / Notes', 'Expected Improvement Direction', 'Submitted At', 'Response ID'
];

const ENDLINE_HEADERS = [
  'Engagement ID', 'Organisation', 'Engagement / Project', 'Metric ID', 'ROI Area', 'Metric',
  'Metric Selection Source', 'Metric Response Status', 'Expected Improvement Direction',
  'Baseline Capture Type', 'Baseline Captured At', 'Baseline Value', 'Baseline Unit',
  'Baseline Comments / Notes', 'Reason Added at Endline',
  'Endline Value', 'Endline Unit', 'Calculated Change', 'Change Direction', 'Comparison Available?',
  'What Changed', 'Evidence / Source',
  'Can Be Converted to Monetary Value?', '₹ Value per Unit', 'Value Basis',
  'Monetary Value Before Attribution', 'Goalkeep Attribution Bucket', 'Attribution %',
  'Deadweight %', 'Adjusted Change', 'Attributed Monetary Value',
  'Why This Attribution Level?', 'External-use Permission', 'Quote or Example',
  'Submitted At', 'Response ID'
];

const OTHER_HEADERS = [
  'Engagement ID', 'Organisation', 'Engagement / Project', 'ROI Area',
  'Baseline Other Metric Names', 'Endline Other Metric Names',
  'Baseline Submitted At', 'Endline Submitted At'
];

const RAW_HEADERS = [
  'Submitted At', 'Client Submission ID', 'Response ID', 'Engagement ID', 'Survey Type',
  'Organisation', 'Engagement / Project', 'Respondent Name', 'Email',
  'Status', 'Error Message', 'Raw Payload'
];

const CATALOGUE_HEADERS = [
  'Record Type', 'ID', 'ROI Area', 'Label / Question', 'Baseline Question', 'Endline Question',
  'What This Captures', 'Metric Type', 'Unit Options', 'Expected Improvement Direction',
  'Ask Monetisation?', 'Baseline Enabled?', 'Endline Only?', 'Allow N/A?', 'Example', 'Active'
];

/** Run once in a NEW Apps Script project. */
function createGoalkeepROIWebsiteSystemV2() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ROI_WEBSITE_V2_SPREADSHEET_ID')) {
    throw new Error(
      'A Goalkeep ROI Website V2 system is already linked to this Apps Script project. ' +
      'Run showGoalkeepROIWebsiteSystemV2Links() to open it, or use a new Apps Script project.'
    );
  }

  const ss = SpreadsheetApp.create(`${SYSTEM_NAME} — Multi-client Responses`);
  setupWorkbook_(ss);
  organiseSheets_(ss);
  props.setProperty('ROI_WEBSITE_V2_SPREADSHEET_ID', ss.getId());

  Logger.log('SYSTEM CREATED');
  Logger.log('Response workbook: ' + ss.getUrl());
  Logger.log('Next: deploy this Apps Script project as a Web app and paste its /exec URL into index.html.');
}

function showGoalkeepROIWebsiteSystemV2Links() {
  const ss = getSystemSpreadsheet_();
  Logger.log('Response workbook: ' + ss.getUrl());
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const callback = safeCallback_(params.callback || '');

  try {
    const ss = getSystemSpreadsheet_();
    setupWorkbook_(ss);
    const action = params.action || 'health';

    if (action === 'getConfig') {
      return json_({
        status: 'success',
        rating_questions: RATING_QUESTIONS,
        metrics: METRICS,
        roi_areas: ROI_AREAS,
        attribution_buckets: ATTRIBUTION_MAP,
        default_deadweight: DEFAULT_DEADWEIGHT
      }, callback);
    }

    if (action === 'getBaseline') {
      if (!params.engagement_id) throw new Error('Missing engagement_id.');
      return json_(getBaseline_(ss, params.engagement_id), callback);
    }

    if (action === 'getSubmissionStatus') {
      if (!params.client_submission_id) throw new Error('Missing client_submission_id.');
      return json_(getSubmissionStatus_(ss, params.client_submission_id), callback);
    }

    return json_({
      status: 'ok',
      message: 'Goalkeep ROI Website Backend V2 is live.',
      available_actions: ['getConfig', 'getBaseline', 'getSubmissionStatus']
    }, callback);

  } catch (err) {
    return json_({ status: 'error', message: err.message }, callback);
  }
}

function doPost(e) {
  let ss = null;
  let payload = {};
  let responseId = '';
  let engagementId = '';
  let clientSubmissionId = '';
  const lock = LockService.getScriptLock();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No POST body received.');
    }

    payload = JSON.parse(e.postData.contents);
    clientSubmissionId = String(payload.client_submission_id || '').trim();
    if (!clientSubmissionId) throw new Error('Missing client_submission_id.');

    ss = getSystemSpreadsheet_();
    setupWorkbook_(ss);
    lock.waitLock(30000);

    const existingSubmission = findRawSubmission_(ss, clientSubmissionId);
    if (existingSubmission) {
      return json_({
        status: String(existingSubmission.Status || '').toLowerCase(),
        response_id: existingSubmission['Response ID'] || '',
        engagement_id: existingSubmission['Engagement ID'] || '',
        message: existingSubmission['Error Message'] || 'Submission already processed.'
      });
    }

    const surveyType = String(payload.survey_type || '').toLowerCase();
    if (surveyType !== 'baseline' && surveyType !== 'endline') {
      throw new Error('survey_type must be baseline or endline.');
    }

    validateCommonPayload_(payload);
    validateRatings_(payload.rating_answers);
    validateMetricAnswers_(payload.metric_answers, surveyType);
    validateOtherMetrics_(payload.other_metrics);

    responseId = Utilities.getUuid();

    if (surveyType === 'baseline') {
      engagementId = makeUniqueEngagementId_(ss, payload.organisation, payload.engagement_name, payload.date);
      saveBaseline_(ss, responseId, engagementId, payload);
    } else {
      engagementId = String(payload.engagement_id || '').trim();
      if (!engagementId) throw new Error('Endline submission requires an Engagement ID.');
      if (!findClientRow_(ss, engagementId)) {
        throw new Error('No Baseline engagement was found for this Engagement ID.');
      }
      saveEndline_(ss, responseId, engagementId, payload);
    }

    appendRawSubmission_(ss, {
      submittedAt: new Date(), clientSubmissionId, responseId, engagementId,
      surveyType, payload, status: 'success', errorMessage: ''
    });

    return json_({
      status: 'success',
      response_id: responseId,
      engagement_id: engagementId,
      message: surveyType === 'baseline'
        ? 'Baseline saved successfully.'
        : 'Endline saved successfully.'
    });

  } catch (err) {
    if (ss && clientSubmissionId) {
      try {
        appendRawSubmission_(ss, {
          submittedAt: new Date(), clientSubmissionId, responseId,
          engagementId: engagementId || String(payload.engagement_id || ''),
          surveyType: String(payload.survey_type || ''),
          payload, status: 'error', errorMessage: err.message
        });
      } catch (logErr) {
        console.error(logErr);
      }
    }
    return json_({ status: 'error', message: err.message });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function saveBaseline_(ss, responseId, engagementId, payload) {
  const now = new Date();
  const clientSheet = ss.getSheetByName(SHEET_NAMES.CLIENTS);

  appendObjectRow_(clientSheet, CLIENT_HEADERS, {
    'Engagement ID': engagementId,
    'Organisation': payload.organisation,
    'Engagement / Project': payload.engagement_name,
    'Baseline Respondent Name': payload.respondent_name,
    'Baseline Email': payload.email || '',
    'Baseline Date': payload.date,
    'Baseline Submitted At': now,
    'Status': 'Baseline completed — Endline pending',
    'Baseline Response ID': responseId
  });

  upsertRatings_(ss, engagementId, payload, 'baseline', now);
  upsertBaselineMetrics_(ss, responseId, engagementId, payload, now);
  upsertOtherMetrics_(ss, engagementId, payload, 'baseline', now);
}

function saveEndline_(ss, responseId, engagementId, payload) {
  const now = new Date();
  const clientSheet = ss.getSheetByName(SHEET_NAMES.CLIENTS);
  const clientRow = findClientRow_(ss, engagementId);
  const existing = getRowObject_(clientSheet, clientRow);

  writeObjectRow_(clientSheet, CLIENT_HEADERS, clientRow, Object.assign({}, existing, {
    'Endline Respondent Name': payload.respondent_name,
    'Endline Email': payload.email || '',
    'Endline Date': payload.date,
    'Endline Submitted At': now,
    'Status': 'Endline completed',
    'Endline Response ID': responseId
  }));

  upsertRatings_(ss, engagementId, payload, 'endline', now);
  upsertEndlineMetrics_(ss, responseId, engagementId, payload, now, existing);
  upsertOtherMetrics_(ss, engagementId, payload, 'endline', now);
}

function upsertRatings_(ss, engagementId, payload, surveyType, submittedAt) {
  const sheet = ss.getSheetByName(SHEET_NAMES.RATINGS);
  const answers = Array.isArray(payload.rating_answers) ? payload.rating_answers : [];

  answers.forEach(answer => {
    const config = getRatingConfig_(answer.question_id);
    if (!config) return;

    const rowNumber = findCompositeRow_(sheet, 'Engagement ID', engagementId, 'Rating ID', config.id);
    const existing = rowNumber ? getRowObject_(sheet, rowNumber) : {};
    const merged = Object.assign({}, existing, {
      'Engagement ID': engagementId,
      'Organisation': payload.organisation,
      'Engagement / Project': payload.engagement_name,
      'Rating ID': config.id,
      'ROI Area': config.area,
      'What This Captures': config.captures,
      'Baseline Question': config.baseline,
      'Endline Question': config.endline
    });

    if (surveyType === 'baseline') {
      merged['Baseline Rating / 5'] = numberOrBlank_(answer.rating);
      merged['Baseline Rating Reason'] = answer.reason || '';
      merged['Baseline Submitted At'] = submittedAt;
    } else {
      merged['Endline Rating / 5'] = numberOrBlank_(answer.rating);
      merged['Endline Rating Reason'] = answer.reason || '';
      merged['Endline Submitted At'] = submittedAt;
    }

    const baselineRating = numberOrBlank_(merged['Baseline Rating / 5']);
    const endlineRating = numberOrBlank_(merged['Endline Rating / 5']);
    merged['Rating Change'] = baselineRating !== '' && endlineRating !== ''
      ? endlineRating - baselineRating
      : '';

    writeObjectRow_(sheet, RATING_HEADERS, rowNumber, merged);
  });
}

function upsertBaselineMetrics_(ss, responseId, engagementId, payload, submittedAt) {
  const sheet = ss.getSheetByName(SHEET_NAMES.BASELINE);
  const answers = Array.isArray(payload.metric_answers) ? payload.metric_answers : [];

  answers.forEach(answer => {
    const metric = getMetricConfig_(answer.metric_id);
    if (!metric || metric.baselineEnabled === false) return;

    const status = normaliseMetricStatus_(answer.metric_response_status);
    const rowNumber = findCompositeRow_(sheet, 'Engagement ID', engagementId, 'Metric ID', metric.id);
    const row = {
      'Engagement ID': engagementId,
      'Organisation': payload.organisation,
      'Engagement / Project': payload.engagement_name,
      'Metric ID': metric.id,
      'ROI Area': metric.area,
      'Metric': metric.label,
      'Metric Response Status': status,
      'Baseline Value': status === 'Not applicable' ? '' : cleanValueForType_(answer.value, metric.type),
      'Baseline Unit': status === 'Not applicable' ? '' : (answer.unit || defaultUnit_(metric)),
      'Exact / Estimated': status === 'Not applicable' ? 'Not applicable' : (answer.assumption_type || ''),
      'Comments / Notes': answer.comments_notes || '',
      'Expected Improvement Direction': metric.directionText || '',
      'Submitted At': submittedAt,
      'Response ID': responseId
    };

    writeObjectRow_(sheet, BASELINE_HEADERS, rowNumber, row);
  });
}

function upsertEndlineMetrics_(ss, responseId, engagementId, payload, submittedAt, clientRecord) {
  const endlineSheet = ss.getSheetByName(SHEET_NAMES.ENDLINE);
  const baselineSheet = ss.getSheetByName(SHEET_NAMES.BASELINE);
  const answers = Array.isArray(payload.metric_answers) ? payload.metric_answers : [];

  answers.forEach(answer => {
    const metric = getMetricConfig_(answer.metric_id);
    if (!metric || metric.endlineEnabled === false) return;

    const baselineRowNumber = findCompositeRow_(baselineSheet, 'Engagement ID', engagementId, 'Metric ID', metric.id);
    const baseline = baselineRowNumber ? getRowObject_(baselineSheet, baselineRowNumber) : null;
    const endlineRowNumber = findCompositeRow_(endlineSheet, 'Engagement ID', engagementId, 'Metric ID', metric.id);

    let selectionSource = baseline
      ? 'Selected at Baseline'
      : metric.endlineOnly
        ? 'Endline-only metric'
        : 'Added at Endline';

    const metricStatus = normaliseMetricStatus_(answer.metric_response_status);
    let baselineCaptureType = '';
    let baselineCapturedAt = '';
    let baselineValue = '';
    let baselineUnit = '';
    let baselineComments = '';
    let reasonAdded = '';

    if (baseline) {
      baselineCaptureType = 'Original Baseline';
      baselineCapturedAt = baseline['Submitted At'];
      baselineValue = baseline['Baseline Value'];
      baselineUnit = baseline['Baseline Unit'];
      baselineComments = baseline['Comments / Notes'];
    } else if (metric.endlineOnly) {
      baselineCaptureType = 'Endline-only metric';
    } else {
      baselineCaptureType = String(answer.baseline_capture_type || '').trim();
      baselineCapturedAt = submittedAt;
      reasonAdded = answer.reason_added_at_endline || '';
      baselineComments = answer.retrospective_baseline_comments || '';
      if (baselineCaptureType === 'Retrospective exact' || baselineCaptureType === 'Retrospective estimated') {
        baselineValue = cleanValueForType_(answer.retrospective_baseline_value, metric.type);
        baselineUnit = answer.retrospective_baseline_unit || defaultUnit_(metric);
      }
    }

    const endlineValue = metricStatus === 'Not applicable'
      ? ''
      : cleanValueForType_(answer.value, metric.type);
    const endlineUnit = metricStatus === 'Not applicable'
      ? ''
      : (answer.unit || baselineUnit || defaultUnit_(metric));

    const changeResult = calculateChange_(
      metric,
      baselineValue,
      endlineValue,
      baselineCaptureType,
      metricStatus
    );

    const attributionBucket = metricStatus === 'Not applicable' ? '' : (answer.attribution_bucket || '');
    const attributionRate = ATTRIBUTION_MAP[attributionBucket] !== undefined
      ? ATTRIBUTION_MAP[attributionBucket]
      : '';

    let monetisable = metricStatus === 'Not applicable' ? '' : (answer.monetisable || '');
    let valuePerUnit = metricStatus === 'Not applicable' ? '' : numberOrBlank_(answer.value_per_unit);
    let valueBasis = metricStatus === 'Not applicable' ? '' : (answer.value_basis || '');
    let monetaryBeforeAttribution = '';

    if (metric.type === 'currency' && changeResult.comparisonAvailable) {
      monetisable = 'Direct financial value';
      valuePerUnit = 1;
      valueBasis = valueBasis || 'The metric is already entered in rupees.';
      monetaryBeforeAttribution = changeResult.numericChange;
    } else if (
      monetisable === 'Yes' &&
      changeResult.comparisonAvailable &&
      typeof changeResult.numericChange === 'number' &&
      valuePerUnit !== ''
    ) {
      monetaryBeforeAttribution = changeResult.numericChange * valuePerUnit;
    }

    const adjustedChange = changeResult.comparisonAvailable && attributionRate !== ''
      ? changeResult.numericChange * attributionRate * (1 - DEFAULT_DEADWEIGHT)
      : '';

    const attributedMonetaryValue = monetaryBeforeAttribution !== '' && attributionRate !== ''
      ? monetaryBeforeAttribution * attributionRate * (1 - DEFAULT_DEADWEIGHT)
      : '';

    const row = {
      'Engagement ID': engagementId,
      'Organisation': clientRecord['Organisation'] || payload.organisation,
      'Engagement / Project': clientRecord['Engagement / Project'] || payload.engagement_name,
      'Metric ID': metric.id,
      'ROI Area': metric.area,
      'Metric': metric.label,
      'Metric Selection Source': selectionSource,
      'Metric Response Status': metricStatus,
      'Expected Improvement Direction': metric.directionText || '',
      'Baseline Capture Type': baselineCaptureType,
      'Baseline Captured At': baselineCapturedAt,
      'Baseline Value': baselineValue,
      'Baseline Unit': baselineUnit,
      'Baseline Comments / Notes': baselineComments,
      'Reason Added at Endline': reasonAdded,
      'Endline Value': endlineValue,
      'Endline Unit': endlineUnit,
      'Calculated Change': changeResult.display,
      'Change Direction': changeResult.direction,
      'Comparison Available?': changeResult.comparisonAvailable ? 'Yes' : 'No',
      'What Changed': answer.what_changed || '',
      'Evidence / Source': answer.evidence || '',
      'Can Be Converted to Monetary Value?': monetisable,
      '₹ Value per Unit': valuePerUnit,
      'Value Basis': valueBasis,
      'Monetary Value Before Attribution': monetaryBeforeAttribution,
      'Goalkeep Attribution Bucket': attributionBucket,
      'Attribution %': attributionRate,
      'Deadweight %': changeResult.comparisonAvailable ? DEFAULT_DEADWEIGHT : '',
      'Adjusted Change': adjustedChange,
      'Attributed Monetary Value': attributedMonetaryValue,
      'Why This Attribution Level?': answer.attribution_reason || '',
      'External-use Permission': answer.external_use_permission || '',
      'Quote or Example': answer.quote_or_example || '',
      'Submitted At': submittedAt,
      'Response ID': responseId
    };

    writeObjectRow_(endlineSheet, ENDLINE_HEADERS, endlineRowNumber, row);
  });
}

function upsertOtherMetrics_(ss, engagementId, payload, surveyType, submittedAt) {
  const sheet = ss.getSheetByName(SHEET_NAMES.OTHER);
  const answers = Array.isArray(payload.other_metrics) ? payload.other_metrics : [];

  ROI_AREAS.forEach(area => {
    const answer = answers.find(item => String(item.area) === area) || {};
    const rowNumber = findCompositeRow_(sheet, 'Engagement ID', engagementId, 'ROI Area', area);
    const existing = rowNumber ? getRowObject_(sheet, rowNumber) : {};
    const merged = Object.assign({}, existing, {
      'Engagement ID': engagementId,
      'Organisation': payload.organisation,
      'Engagement / Project': payload.engagement_name,
      'ROI Area': area
    });

    if (surveyType === 'baseline') {
      merged['Baseline Other Metric Names'] = String(answer.names || '').trim();
      merged['Baseline Submitted At'] = submittedAt;
    } else {
      merged['Endline Other Metric Names'] = String(answer.names || '').trim();
      merged['Endline Submitted At'] = submittedAt;
    }

    writeObjectRow_(sheet, OTHER_HEADERS, rowNumber, merged);
  });
}

function getBaseline_(ss, engagementId) {
  const clientSheet = ss.getSheetByName(SHEET_NAMES.CLIENTS);
  const ratingSheet = ss.getSheetByName(SHEET_NAMES.RATINGS);
  const baselineSheet = ss.getSheetByName(SHEET_NAMES.BASELINE);
  const endlineSheet = ss.getSheetByName(SHEET_NAMES.ENDLINE);
  const otherSheet = ss.getSheetByName(SHEET_NAMES.OTHER);

  const clientRow = findClientRow_(ss, engagementId);
  if (!clientRow) {
    return { status: 'error', message: 'No Baseline record was found for this Engagement ID.' };
  }

  const client = getRowObject_(clientSheet, clientRow);
  const ratings = getAllObjects_(ratingSheet)
    .filter(row => String(row['Engagement ID']) === String(engagementId))
    .map(row => ({
      question_id: row['Rating ID'],
      roi_area: row['ROI Area'],
      baseline_question: row['Baseline Question'],
      endline_question: row['Endline Question'],
      baseline_rating: row['Baseline Rating / 5'],
      baseline_reason: row['Baseline Rating Reason'],
      endline_rating: row['Endline Rating / 5'],
      endline_reason: row['Endline Rating Reason']
    }));

  const baselineMetrics = getAllObjects_(baselineSheet)
    .filter(row => String(row['Engagement ID']) === String(engagementId))
    .map(row => ({
      metric_id: row['Metric ID'],
      roi_area: row['ROI Area'],
      metric: row['Metric'],
      metric_response_status: row['Metric Response Status'],
      baseline_value: row['Baseline Value'],
      baseline_unit: row['Baseline Unit'],
      baseline_assumption_type: row['Exact / Estimated'],
      baseline_comments_notes: row['Comments / Notes'],
      expected_improvement_direction: row['Expected Improvement Direction'],
      submitted_at: normaliseDateTimeForJson_(row['Submitted At'])
    }));

  const endlineMetrics = getAllObjects_(endlineSheet)
    .filter(row => String(row['Engagement ID']) === String(engagementId))
    .map(row => ({
      metric_id: row['Metric ID'],
      metric_selection_source: row['Metric Selection Source'],
      metric_response_status: row['Metric Response Status'],
      baseline_capture_type: row['Baseline Capture Type'],
      baseline_value: row['Baseline Value'],
      baseline_unit: row['Baseline Unit'],
      baseline_comments_notes: row['Baseline Comments / Notes'],
      reason_added_at_endline: row['Reason Added at Endline'],
      endline_value: row['Endline Value'],
      endline_unit: row['Endline Unit'],
      what_changed: row['What Changed'],
      evidence: row['Evidence / Source'],
      monetisable: row['Can Be Converted to Monetary Value?'],
      value_per_unit: row['₹ Value per Unit'],
      value_basis: row['Value Basis'],
      attribution_bucket: row['Goalkeep Attribution Bucket'],
      attribution_reason: row['Why This Attribution Level?'],
      external_use_permission: row['External-use Permission'],
      quote_or_example: row['Quote or Example']
    }));

  const otherMetrics = getAllObjects_(otherSheet)
    .filter(row => String(row['Engagement ID']) === String(engagementId))
    .map(row => ({
      area: row['ROI Area'],
      baseline_names: row['Baseline Other Metric Names'],
      endline_names: row['Endline Other Metric Names']
    }));

  return {
    status: 'success',
    engagement_id: engagementId,
    engagement: {
      organisation: client['Organisation'],
      engagement_name: client['Engagement / Project'],
      respondent_name: client['Baseline Respondent Name'],
      email: client['Baseline Email'],
      baseline_date: normaliseDateForJson_(client['Baseline Date'])
    },
    ratings,
    metrics: baselineMetrics,
    endline_metrics: endlineMetrics,
    other_metrics: otherMetrics
  };
}

function getSubmissionStatus_(ss, clientSubmissionId) {
  const row = findRawSubmission_(ss, clientSubmissionId);
  if (!row) return { status: 'pending' };

  return {
    status: String(row.Status || '').toLowerCase(),
    response_id: row['Response ID'] || '',
    engagement_id: row['Engagement ID'] || '',
    message: row['Error Message'] || ''
  };
}

function appendRawSubmission_(ss, record) {
  const sheet = ss.getSheetByName(SHEET_NAMES.RAW);
  appendObjectRow_(sheet, RAW_HEADERS, {
    'Submitted At': record.submittedAt,
    'Client Submission ID': record.clientSubmissionId,
    'Response ID': record.responseId,
    'Engagement ID': record.engagementId,
    'Survey Type': record.surveyType,
    'Organisation': record.payload.organisation || '',
    'Engagement / Project': record.payload.engagement_name || '',
    'Respondent Name': record.payload.respondent_name || '',
    'Email': record.payload.email || '',
    'Status': record.status,
    'Error Message': record.errorMessage,
    'Raw Payload': JSON.stringify(record.payload)
  });
}

function validateCommonPayload_(payload) {
  if (!String(payload.organisation || '').trim()) throw new Error('Organisation is required.');
  if (!String(payload.engagement_name || '').trim()) throw new Error('Engagement / project is required.');
  if (!String(payload.respondent_name || '').trim()) throw new Error('Respondent name is required.');
  if (!String(payload.date || '').trim()) throw new Error('Response date is required.');
}

function validateRatings_(answers) {
  if (!Array.isArray(answers) || answers.length !== RATING_QUESTIONS.length) {
    throw new Error('All rating questions must be answered.');
  }

  RATING_QUESTIONS.forEach(q => {
    const answer = answers.find(a => a.question_id === q.id);
    const rating = answer ? Number(answer.rating) : NaN;
    if (!answer || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error(`Please provide a 1–5 rating for ${q.id}.`);
    }
  });
}

function validateMetricAnswers_(answers, surveyType) {
  if (!Array.isArray(answers) || !answers.length) {
    throw new Error('At least one metric response is required.');
  }

  const seen = {};
  answers.forEach(answer => {
    const metric = getMetricConfig_(answer.metric_id);
    if (!metric) throw new Error(`Unknown metric: ${answer.metric_id}`);
    if (seen[metric.id]) throw new Error(`Metric ${metric.id} was submitted more than once.`);
    seen[metric.id] = true;

    const status = normaliseMetricStatus_(answer.metric_response_status);
    if (status === 'Not applicable' && !metric.allowNA) {
      throw new Error(`${metric.label} cannot be marked Not applicable.`);
    }

    if (surveyType === 'baseline') {
      if (metric.baselineEnabled === false) {
        throw new Error(`${metric.label} is available only at Endline.`);
      }
      if (status !== 'Not applicable') {
        validateCurrentValue_(answer.value, metric, `Please enter a Baseline value for ${metric.label}.`);
        if (!String(answer.assumption_type || '').trim()) {
          throw new Error(`Please select Exact, Estimated, or Not sure for ${metric.label}.`);
        }
      }
      return;
    }

    if (metric.endlineEnabled === false) {
      throw new Error(`${metric.label} is not available at Endline.`);
    }

    if (status !== 'Not applicable') {
      validateCurrentValue_(answer.value, metric, `Please enter a current value for ${metric.label}.`);
    }

    const selectionSource = String(answer.metric_selection_source || '').trim();
    if (!['Selected at Baseline', 'Added at Endline', 'Endline-only metric'].includes(selectionSource)) {
      throw new Error(`Metric selection source is missing for ${metric.label}.`);
    }

    if (selectionSource === 'Added at Endline' && status !== 'Not applicable') {
      const captureType = String(answer.baseline_capture_type || '').trim();
      const allowed = ['Retrospective exact', 'Retrospective estimated', 'Baseline unavailable'];
      if (!allowed.includes(captureType)) {
        throw new Error(`Please select how the retrospective Baseline was established for ${metric.label}.`);
      }
      if (captureType !== 'Baseline unavailable') {
        validateCurrentValue_(
          answer.retrospective_baseline_value,
          metric,
          `Please enter the retrospective Baseline value for ${metric.label}.`
        );
      }
      if (!String(answer.reason_added_at_endline || '').trim()) {
        throw new Error(`Please explain why ${metric.label} is being added at Endline.`);
      }
    }

    if (status !== 'Not applicable') {
      if (ATTRIBUTION_MAP[answer.attribution_bucket] === undefined) {
        throw new Error(`Please select a Goalkeep attribution bucket for ${metric.label}.`);
      }
      if (!String(answer.external_use_permission || '').trim()) {
        throw new Error(`Please select the external-use permission for ${metric.label}.`);
      }
      if (metric.askMonetisation && answer.monetisable === 'Yes' && numberOrBlank_(answer.value_per_unit) === '') {
        throw new Error(`Please enter the ₹ value per unit for ${metric.label}.`);
      }
    }
  });
}

function validateCurrentValue_(value, metric, message) {
  if (metric.type === 'qualitative') {
    if (!String(value || '').trim()) throw new Error(message);
  } else if (numberOrBlank_(value) === '') {
    throw new Error(message);
  }
}

function validateOtherMetrics_(answers) {
  if (answers === undefined || answers === null) return;
  if (!Array.isArray(answers)) throw new Error('other_metrics must be an array.');
  answers.forEach(answer => {
    if (ROI_AREAS.indexOf(String(answer.area || '')) === -1) {
      throw new Error(`Unknown ROI area in Other Metrics: ${answer.area}`);
    }
  });
}

function calculateChange_(metric, baselineValue, endlineValue, baselineCaptureType, metricStatus) {
  if (metricStatus === 'Not applicable') {
    return { display: '', direction: 'Not applicable', numericChange: null, comparisonAvailable: false };
  }

  if (metric.endlineOnly || baselineCaptureType === 'Endline-only metric') {
    return { display: '', direction: 'Endline-only metric', numericChange: null, comparisonAvailable: false };
  }

  if (baselineCaptureType === 'Baseline unavailable' || baselineValue === '' || baselineValue === null || baselineValue === undefined) {
    return { display: '', direction: 'Baseline unavailable', numericChange: null, comparisonAvailable: false };
  }

  if (metric.type === 'qualitative') {
    return { display: 'Qualitative comparison', direction: 'Qualitative', numericChange: null, comparisonAvailable: false };
  }

  const baseline = numberOrBlank_(baselineValue);
  const endline = numberOrBlank_(endlineValue);
  if (baseline === '' || endline === '') {
    return { display: '', direction: '', numericChange: null, comparisonAvailable: false };
  }

  const change = metric.direction === 'lower_better'
    ? baseline - endline
    : endline - baseline;

  let direction = 'No change';
  if (change > 0) direction = 'Improvement';
  if (change < 0) direction = 'Decline';

  return { display: change, direction, numericChange: change, comparisonAvailable: true };
}

function normaliseMetricStatus_(value) {
  return String(value || '').trim() === 'Not applicable' ? 'Not applicable' : 'Applicable';
}

function makeUniqueEngagementId_(ss, organisation, engagementName, dateValue) {
  const org = cleanIdPart_(organisation).slice(0, 24) || 'ORG';
  const project = cleanIdPart_(engagementName).slice(0, 28) || 'PROJECT';
  const date = cleanDate_(dateValue);

  for (let i = 0; i < 10; i++) {
    const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
    const id = `${org}_${project}_${date}_${suffix}`;
    if (!findClientRow_(ss, id)) return id;
  }
  throw new Error('Could not generate a unique Engagement ID. Please try again.');
}

function setupWorkbook_(ss) {
  const clients = getOrCreateSheet_(ss, SHEET_NAMES.CLIENTS);
  const ratings = getOrCreateSheet_(ss, SHEET_NAMES.RATINGS);
  const baseline = getOrCreateSheet_(ss, SHEET_NAMES.BASELINE);
  const endline = getOrCreateSheet_(ss, SHEET_NAMES.ENDLINE);
  const other = getOrCreateSheet_(ss, SHEET_NAMES.OTHER);
  const raw = getOrCreateSheet_(ss, SHEET_NAMES.RAW);
  const catalogue = getOrCreateSheet_(ss, SHEET_NAMES.CATALOGUE);

  ensureHeaders_(clients, CLIENT_HEADERS);
  ensureHeaders_(ratings, RATING_HEADERS);
  ensureHeaders_(baseline, BASELINE_HEADERS);
  ensureHeaders_(endline, ENDLINE_HEADERS);
  ensureHeaders_(other, OTHER_HEADERS);
  ensureHeaders_(raw, RAW_HEADERS);
  ensureHeaders_(catalogue, CATALOGUE_HEADERS);

  seedCatalogue_(catalogue);
  formatSystemSheet_(clients, CLIENT_HEADERS.length);
  formatSystemSheet_(ratings, RATING_HEADERS.length);
  formatSystemSheet_(baseline, BASELINE_HEADERS.length);
  formatSystemSheet_(endline, ENDLINE_HEADERS.length);
  formatSystemSheet_(other, OTHER_HEADERS.length);
  formatSystemSheet_(raw, RAW_HEADERS.length);
  formatSystemSheet_(catalogue, CATALOGUE_HEADERS.length);
  formatSpecialColumns_(ss);
}

function organiseSheets_(ss) {
  const orderedNames = [
    SHEET_NAMES.CLIENTS, SHEET_NAMES.RATINGS, SHEET_NAMES.BASELINE,
    SHEET_NAMES.ENDLINE, SHEET_NAMES.OTHER, SHEET_NAMES.RAW, SHEET_NAMES.CATALOGUE
  ];

  ss.getSheets().forEach(sheet => {
    if (orderedNames.indexOf(sheet.getName()) === -1 && sheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });

  const tabColours = ['#1a5fa8', '#5545b8', '#34711a', '#8e5409', '#7256b8', '#77736a', '#151512'];
  orderedNames.forEach((name, index) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(index + 1);
    sheet.setTabColor(tabColours[index]);
  });
  ss.setActiveSheet(ss.getSheetByName(SHEET_NAMES.CLIENTS));
}

function seedCatalogue_(sheet) {
  if (sheet.getLastRow() > 1) return;
  const rows = [];

  RATING_QUESTIONS.forEach(q => {
    rows.push([
      'Rating', q.id, q.area, q.baseline, q.baseline, q.endline,
      q.captures, '1–5 rating', '', '', '', '', '', '', '', true
    ]);
  });

  METRICS.forEach(m => {
    rows.push([
      'Metric', m.id, m.area, m.label,
      m.baselineEnabled === false ? 'Not collected at Baseline' : 'What is the Baseline value?',
      m.type === 'qualitative' ? 'Describe the current situation.' : 'What is the current value?',
      '', m.type, (m.units || []).join(' | '), m.directionText || '',
      m.askMonetisation ? 'Yes' : 'No', m.baselineEnabled === false ? 'No' : 'Yes',
      m.endlineOnly ? 'Yes' : 'No', m.allowNA ? 'Yes' : 'No', m.example || '', true
    ]);
  });

  if (rows.length) sheet.getRange(2, 1, rows.length, CATALOGUE_HEADERS.length).setValues(rows);
}

function formatSpecialColumns_(ss) {
  const endline = ss.getSheetByName(SHEET_NAMES.ENDLINE);
  if (!endline) return;
  const maxRows = Math.max(endline.getMaxRows() - 1, 1);
  setColumnFormatByHeader_(endline, 'Attribution %', maxRows, '0.0%');
  setColumnFormatByHeader_(endline, 'Deadweight %', maxRows, '0.0%');
  ['₹ Value per Unit', 'Monetary Value Before Attribution', 'Attributed Monetary Value'].forEach(header => {
    setColumnFormatByHeader_(endline, header, maxRows, '₹#,##0.00');
  });
}

function setColumnFormatByHeader_(sheet, header, rowCount, format) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf(header) + 1;
  if (col > 0) sheet.getRange(2, col, rowCount, 1).setNumberFormat(format);
}

function findClientRow_(ss, engagementId) {
  return findRowByValue_(ss.getSheetByName(SHEET_NAMES.CLIENTS), 'Engagement ID', engagementId);
}

function findRawSubmission_(ss, clientSubmissionId) {
  const sheet = ss.getSheetByName(SHEET_NAMES.RAW);
  const rowNumber = findRowByValue_(sheet, 'Client Submission ID', clientSubmissionId);
  return rowNumber ? getRowObject_(sheet, rowNumber) : null;
}

function getRatingConfig_(id) {
  return RATING_QUESTIONS.find(q => q.id === id) || null;
}

function getMetricConfig_(id) {
  return METRICS.find(m => m.id === id) || null;
}

function defaultUnit_(metric) {
  return metric && metric.units && metric.units.length ? metric.units[0] : '';
}

function cleanValueForType_(value, type) {
  if (type === 'qualitative') return String(value || '').trim();
  return numberOrBlank_(value);
}

function numberOrBlank_(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : '';
}

function cleanIdPart_(value) {
  return String(value || '').trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function cleanDate_(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd');
}

function normaliseDateForJson_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return String(value || '');
}

function normaliseDateTimeForJson_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value || '');
}

function getSystemSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('ROI_WEBSITE_V2_SPREADSHEET_ID');
  if (!id) {
    throw new Error('System not set up. Run createGoalkeepROIWebsiteSystemV2() once first.');
  }
  return SpreadsheetApp.openById(id);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    headers.forEach(header => {
      if (current.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      }
    });
  }
  sheet.setFrozenRows(1);
}

function formatSystemSheet_(sheet, headerCount) {
  sheet.setFrozenRows(1);
  const header = sheet.getRange(1, 1, 1, headerCount);
  header.setFontWeight('bold').setBackground('#151512').setFontColor('#ffffff').setWrap(true);

  if (!sheet.getFilter() && sheet.getLastColumn() > 0) {
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getLastColumn()).createFilter();
  }

  sheet.getDataRange().setVerticalAlignment('top');
  sheet.setColumnWidth(1, 170);
  for (let col = 2; col <= Math.min(headerCount, 14); col++) sheet.setColumnWidth(col, 155);
}

function appendObjectRow_(sheet, headers, obj) {
  const row = headers.map(header => obj[header] !== undefined ? obj[header] : '');
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function writeObjectRow_(sheet, headers, rowNumber, obj) {
  const row = headers.map(header => obj[header] !== undefined ? obj[header] : '');
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
    return rowNumber;
  }
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function getAllObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  });
}

function getRowObject_(sheet, rowNumber) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const obj = {};
  headers.forEach((header, index) => { obj[header] = row[index]; });
  return obj;
}

function findRowByValue_(sheet, headerName, value) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const column = headers.indexOf(headerName) + 1;
  if (!column) return null;

  const values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return null;
}

function findCompositeRow_(sheet, headerOne, valueOne, headerTwo, valueTwo) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colOne = headers.indexOf(headerOne);
  const colTwo = headers.indexOf(headerTwo);
  if (colOne < 0 || colTwo < 0) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][colOne]) === String(valueOne) && String(rows[i][colTwo]) === String(valueTwo)) {
      return i + 2;
    }
  }
  return null;
}

function safeCallback_(callback) {
  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback) ? callback : '';
}

function json_(object, callback) {
  const output = callback
    ? `${callback}(${JSON.stringify(object)});`
    : JSON.stringify(object);

  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
