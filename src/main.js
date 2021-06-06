function test() {
  let taskObj = {
    title: 'にょん',
    // ここは+09:00にすると何故か1日前になってしまう
    due: '2021-06-30T00:00:00+00:00',
    status: 'needsAction',
    parent: 'VXZJamJjMWZ1QTRWY2pYWQ',
    notes: 'にゃー',
  };
  Tasks.Tasks.insert(taskObj, 'MDA1NjM2MDMzNjkzMjA2MDEwNjc6MDow', {parent: 'VXZJamJjMWZ1QTRWY2pYWQ'});
}

function doGet(e) {
  let htmlTemplate = HtmlService.createTemplateFromFile('index');
  // htmlTemplate.fileid = fileid;
  let htmlOutput = htmlTemplate.evaluate();
  htmlOutput.setTitle('My Task Board');
  return htmlOutput;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function writeAllTasklistToSheet() {
  const lastRow = SHEET_TASKLIST.getLastRow();
  const prvTasklists = lastRow === 1 ? [] : SHEET_TASKLIST.getRange(2, 1, SHEET_TASKLIST.getLastRow() - 1, SHEET_TASKLIST.getLastColumn()).getValues();
  const prvTasklistObj = prvTasklists.reduce((previous, current) => {
    previous[current[0]] = {
      title: current[1],
      icon: current[2],
      isSubject: current[3],
    };
    return previous;
  }, {});
  const crntTasklists = Tasks.Tasklists.list({maxResults: 100}).items;
  const crntTasklistObj = crntTasklists.reduce((previous, current) => {
    previous[current.id] = {
      title: current.title,
      icon: prvTasklistObj[current.id] ? prvTasklistObj[current.id].icon : '',
      isSubject: prvTasklistObj[current.id] ? prvTasklistObj[current.id].isSubject : '◯',
    };
    return previous;
  }, {});
  const newTasklists = Object.keys(crntTasklistObj).map((key) => {
    return [key, crntTasklistObj[key].title, crntTasklistObj[key].icon];
  });
  if(newTasklists.length > 0) {
    SHEET_TASKLIST.getRange(2, 1, newTasklists.length, newTasklists[0].length).setValues(newTasklists);
  }
}

function getAllTaskInfoList() {
  const tasklistObj = getTasklistObj();
  return Object.keys(tasklistObj).reduce((previous, tasklistId) => {
    // 1リスト分のタスク
    const tasks = getTasksInTasklist(tasklistId);
    return tasks.reduce((prev, task) => {
      prev.push(convTaskToTaskInfo(task, tasklistId, tasklistObj));
      return prev;
    }, previous);
  }, []);
}

function getTasksInTasklist(tasklistId) {
  const todayNum = Number(NOW.format('d'));
  // 先週の月曜日以降
  const fromDate = Moment.moment(NOW).subtract(todayNum - 1 + 7, 'd').format('YYYY-MM-DDTHH:mm:ss') + '+09:00';
  const undoneTasks = Tasks.Tasks.list(tasklistId, {maxResults: 100, showHidden: false, showCompleted: false}).items || [];
  const doneTasks = Tasks.Tasks.list(tasklistId, {maxResults: 100, showHidden: true, showCompleted: true, completedMin: fromDate}).items || [];
  return undoneTasks.concat(doneTasks);
}

function convTaskToTaskInfo(task, tasklistId, taskListObj) {
  let tmpNotes = {};
  try {
    tmpNotes = JSON.parse(task.notes);
  } catch {
    // エラーの場合、tmpNotesは空のままとする
  }
  return {
    id: task.id,
    title: task.title,
    icon: taskListObj[tasklistId].icon,
    status: task.status,
    customStatus: task.status === 'completed' ? 'done' : tmpNotes.customStatus,
    // completed: task.completed,
    deadline: task.due ? task.due.slice(0, 10) : '',
    plannedDate: tmpNotes.plannedDate,
    waiting: tmpNotes.waiting,
    note: tmpNotes.note,
    parent: task.parent,
    // position: task.position,
    tasklistId: tasklistId,
  };
}

function getTasklistObj() {
  const lastRow = SHEET_TASKLIST.getLastRow();
  const tasklists = lastRow === 1 ? [] : SHEET_TASKLIST.getRange(2, 1, SHEET_TASKLIST.getLastRow() - 1, SHEET_TASKLIST.getLastColumn()).getValues();
  return tasklists.filter((tasklist) => {
    return tasklist[3] === '◯';
  }).reduce((previous, current) => {
    previous[current[0]] = {
      title: current[1],
      icon: current[2] || '⚪',
    };
    return previous;
  }, {});
}

function getTasklistInfo() {
  return JSON.stringify(getTasklistObj());
}

function getAllTaskInfos() {
  return JSON.stringify(getAllTaskInfoList());
}

function prepareInitialSettingToTasks() {
  const tasklistObj = getTasklistObj();
  const taskObj = Object.keys(tasklistObj).reduce((previous, tasklistId) => {
    const tasks = getTasksInTasklist(tasklistId);
    return tasks.reduce((prev, task) => {
      task.tasklistId = tasklistId;
      prev[task.id] = task;
      return prev;
    }, previous);
  }, {});
  Object.keys(taskObj).filter((key) => {
    // 親がないものを対象とする
    return !taskObj[key].parent;
  })
  .filter((key) => {
    try {
      JSON.parse(taskObj[key].notes);
    } catch(error) {
      // エラーとなった場合、JSON形式の文字列じゃないので、初期処理対象
      return true;
    }
  }).forEach((key) => {
    let tmpTask = taskObj[key];
    let initialJsonObj = {
      customStatus: 'todo',
      waiting: false,
      plannedDate: '',
    };
    initialJsonObj.note = tmpTask.notes || '';
    tmpTask.notes = JSON.stringify(initialJsonObj);
    Tasks.Tasks.update(tmpTask, tmpTask.tasklistId, tmpTask.id);
  });
}

function upsertTask(taskInfoObjs) {
  try {
    return JSON.stringify(taskInfoObjs.reduce((previous, taskInfoObj) => {
      const notesJsonObj = {
        customStatus: taskInfoObj.customStatus,
        waiting: taskInfoObj.waiting,
        plannedDate: taskInfoObj.plannedDate,
        note: taskInfoObj.note,
      };
      let taskObj = {
        title: taskInfoObj.title,
        // ここは+09:00にすると何故か1日前になってしまう
        due: taskInfoObj.deadline ? taskInfoObj.deadline + 'T00:00:00+00:00' : '',
        status: taskInfoObj.customStatus === 'done' ? 'completed' : taskInfoObj.status,
        notes: JSON.stringify(notesJsonObj),
      };
      const tasklistObj = getTasklistObj();
        let upsertedTask = {};
        Tasks.Tasks.move(taskInfoObj.tasklistId, taskInfoObj.id);
        if(taskInfoObj.id) {
          taskObj.id = taskInfoObj.id;
          upsertedTask = Tasks.Tasks.update(taskObj, taskInfoObj.tasklistId, taskInfoObj.id);
        } else {
          Logger.log(taskObj);
          upsertedTask = Tasks.Tasks.insert(taskObj, taskInfoObj.tasklistId, {parent: taskInfoObj.parent});
        }
        previous.push(convTaskToTaskInfo(upsertedTask, taskInfoObj.tasklistId, tasklistObj));
        return previous;
    }, []));
  } catch (error) {
    return JSON.stringify(error);
  }
}