const NOW = Moment.moment();

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const THIS_BOOK = SpreadsheetApp.getActiveSpreadsheet();

const SHEET_TASKLIST = THIS_BOOK.getSheetByName('tasklists');
const SHEET_SETTING = THIS_BOOK.getSheetByName('settings');
const SETTING_DIC = getSettingDic();

function getSettingDic() {
  return SHEET_SETTING.getRange(
    2,
    1,
    SHEET_SETTING.getLastRow() - 1,
    SHEET_SETTING.getLastColumn()
  )
    .getValues()
    .filter((setting) => {
      return setting[0];
    })
    .reduce((previous, current) => {
      previous[current[0]] = [current[1]];
      return previous;
    }, {});
}
