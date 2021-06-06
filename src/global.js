const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const THIS_BOOK = SpreadsheetApp.getActiveSpreadsheet();

const SHEET_TASKLIST = THIS_BOOK.getSheetByName('tasklists');

const NOW = Moment.moment();