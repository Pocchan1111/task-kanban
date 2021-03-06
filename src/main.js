function test() {}

function doGet(e) {
  const pageTitle = SETTING_DIC['PAGE_TITLE'].toString() || 'My Task Kanban';
  let htmlTemplate = HtmlService.createTemplateFromFile('index');
  htmlTemplate.ssId = THIS_BOOK.getId();
  htmlTemplate.useThisWeek = SETTING_DIC['USE_THIS_WEEK'];
  htmlTemplate.useToday = SETTING_DIC['USE_TODAY'];
  htmlTemplate.defaultOrder = SETTING_DIC['DEFAULT_ORDER'];
  htmlTemplate.defaultClassify = SETTING_DIC['DEFAULT_CLASSIFY'];
  htmlTemplate.showNote =
    SETTING_DIC['SHOW_NOTE'].toString() === 'true'
      ? SETTING_DIC['SHOW_NOTE']
      : '';
  htmlTemplate.pageTitle = pageTitle;
  let htmlOutput = htmlTemplate.evaluate();
  htmlOutput.setTitle(pageTitle);
  return htmlOutput;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function exportAllTasklistToSheet() {
  const lastRow = SHEET_TASKLIST.getLastRow();
  const prvTasklists =
    lastRow === 1
      ? []
      : SHEET_TASKLIST.getRange(
          2,
          1,
          SHEET_TASKLIST.getLastRow() - 1,
          SHEET_TASKLIST.getLastColumn()
        ).getValues();
  if (SHEET_TASKLIST.getLastRow() > 0) {
    SHEET_TASKLIST.getRange(
      2,
      1,
      SHEET_TASKLIST.getLastRow() - 1,
      SHEET_TASKLIST.getLastColumn()
    ).clearContent();
  }
  const prvTasklistObj = prvTasklists
    .filter((prvTasklist) => {
      return prvTasklist[0];
    })
    .reduce((previous, current) => {
      previous[current[0]] = {
        title: current[1],
        prefix: current[2],
        isSubject: current[3],
        description: current[4],
      };
      return previous;
    }, {});
  const crntTasklists = Tasks.Tasklists.list({ maxResults: 100 }).items;
  const crntTasklistObj = crntTasklists.reduce((previous, current) => {
    previous[current.id] = {
      title: current.title,
      prefix:
        current.id in prvTasklistObj ? prvTasklistObj[current.id].prefix : '',
      isSubject:
        current.id in prvTasklistObj
          ? prvTasklistObj[current.id].isSubject
          : '???',
      description:
        current.id in prvTasklistObj
          ? prvTasklistObj[current.id].description
          : '',
    };
    return previous;
  }, {});
  const newTasklists = Object.keys(crntTasklistObj).map((key) => {
    return [
      key,
      crntTasklistObj[key].title,
      crntTasklistObj[key].prefix,
      crntTasklistObj[key].isSubject,
      crntTasklistObj[key].description,
    ];
  });
  if (newTasklists.length > 0) {
    SHEET_TASKLIST.getRange(
      2,
      1,
      newTasklists.length,
      newTasklists[0].length
    ).setValues(newTasklists);
  }
}

function getAllTaskInfoList() {
  const tasklistObj = getTasklistObj();
  return Object.keys(tasklistObj).reduce((previous, tasklistId) => {
    // 1????????????????????????
    const tasks = getTasksInTasklist(tasklistId);
    return tasks.reduce((prev, task) => {
      prev.push(convTaskToTaskInfo(task, tasklistId, tasklistObj));
      return prev;
    }, previous);
  }, []);
}

function getTasksInTasklist(tasklistId) {
  const todayNum = Number(NOW.format('d'));
  // ????????????????????????
  const fromDate =
    Moment.moment(NOW)
      .subtract(todayNum - 1 + 7, 'd')
      .format('YYYY-MM-DDTHH:mm:ss') + '+09:00';
  const undoneTasks =
    Tasks.Tasks.list(tasklistId, {
      maxResults: 100,
      showHidden: false,
      showCompleted: false,
    }).items || [];
  const doneTasks =
    Tasks.Tasks.list(tasklistId, {
      maxResults: 100,
      showHidden: true,
      showCompleted: true,
      completedMin: fromDate,
    }).items || [];
  return undoneTasks.concat(doneTasks);
}

function convTaskToTaskInfo(task, tasklistId, taskListObj) {
  let tmpNotes = {};
  try {
    tmpNotes = JSON.parse(task.notes);
  } catch (error) {
    // ?????????????????????tmpNotes????????????????????????
  }
  const customStatus = tmpNotes.customStatus || 'todo';
  return {
    id: task.id,
    title: task.title,
    prefix: taskListObj[tasklistId] ? taskListObj[tasklistId].prefix : '???',
    status: task.status,
    customStatus: task.status === 'completed' ? 'done' : customStatus,
    // completed: task.completed,
    deadline: task.due ? task.due.slice(0, 10) : '',
    plannedDate: tmpNotes.plannedDate || '',
    waiting: tmpNotes.waiting || false,
    note: tmpNotes.note || '',
    parent: task.parent,
    position: task.position,
    tasklistId: tasklistId,
  };
}

function getTasklistObj() {
  const lastRow = SHEET_TASKLIST.getLastRow();
  const tasklists =
    lastRow === 1
      ? []
      : SHEET_TASKLIST.getRange(
          2,
          1,
          SHEET_TASKLIST.getLastRow() - 1,
          SHEET_TASKLIST.getLastColumn()
        ).getValues();
  return tasklists
    .filter((tasklist) => {
      return tasklist[0] && tasklist[3] === '???';
    })
    .reduce((previous, current) => {
      previous[current[0]] = {
        title: current[1],
        prefix: current[2] || '???',
        description: current[4],
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

// ???notes???json???????????????????????????????????????????????????????????????
// function prepareInitialSettingToTasks() {
//   const tasklistObj = getTasklistObj();
//   const taskObj = Object.keys(tasklistObj).reduce((previous, tasklistId) => {
//     const tasks = getTasksInTasklist(tasklistId);
//     return tasks.reduce((prev, task) => {
//       task.tasklistId = tasklistId;
//       prev[task.id] = task;
//       return prev;
//     }, previous);
//   }, {});
//   Object.keys(taskObj)
//     .filter((key) => {
//       // ????????????????????????????????????
//       return !taskObj[key].parent;
//     })
//     .filter((key) => {
//       try {
//         JSON.parse(taskObj[key].notes);
//       } catch (error) {
//         // ??????????????????????????????JSON?????????????????????????????????????????????????????????
//         return true;
//       }
//     })
//     .forEach((key) => {
//       let tmpTask = taskObj[key];
//       let initialJsonObj = {
//         customStatus: 'todo',
//         waiting: false,
//         plannedDate: '',
//       };
//       initialJsonObj.note = tmpTask.notes || '';
//       tmpTask.notes = JSON.stringify(initialJsonObj);
//       Tasks.Tasks.update(tmpTask, tmpTask.tasklistId, tmpTask.id);
//     });
// }

function upsertTask(taskInfoObjs) {
  let upsertedTask = {};
  let errors = [];
  let beforeId = '';
  const resTaskInfos = taskInfoObjs.reduce((previous, taskInfoObj) => {
    const notesJsonObj = {
      customStatus: taskInfoObj.customStatus,
      waiting: taskInfoObj.waiting,
      plannedDate: taskInfoObj.plannedDate,
      note: taskInfoObj.note,
    };
    let taskObj = {
      title: taskInfoObj.title,
      // ?????????+09:00?????????????????????1???????????????????????????
      due: taskInfoObj.deadline ? taskInfoObj.deadline + 'T00:00:00+00:00' : '',
      status:
        taskInfoObj.customStatus === 'done' ? 'completed' : taskInfoObj.status,
      notes: JSON.stringify(notesJsonObj),
    };

    // id????????????????????????update
    if (taskInfoObj.id) {
      // taskInfoObj??????????????????tasklistId????????????????????????????????????????????????
      const existTasks = Tasks.Tasks.list(taskInfoObj.tasklistId).items;
      // ?????????????????????????????????????????????
      let isExist = false;
      if (existTasks && existTasks.length > 0) {
        isExist = existTasks
          .map((existTask) => {
            return existTask.id;
          })
          .some((existTaskId) => {
            return existTaskId === taskInfoObj.id;
          });
      }
      // ??????????????????????????????????????????(????????????????????????????????????????????????????????????????????????)?????????
      //   ????????????????????????API?????????????????????????????????
      if (!isExist) {
        try {
          const newTask = Tasks.Tasks.insert(taskObj, taskInfoObj.tasklistId);
          Tasks.Tasks.remove(taskInfoObj.tasklistId, taskInfoObj.id);
          // ?????????ID???beforeId????????????????????????????????????????????????ID??????id?????????????????????
          beforeId = taskInfoObj.id;
          taskInfoObj.id = newTask.id;
        } catch (error) {
          const errorObj = {
            error,
            process: 'move_task_between_lists',
            taskInfo: taskInfoObj,
          };
          errors.push(errorObj);
        }
      }
      taskObj.id = taskInfoObj.id;
      // previous?????????????????????????????????move??????
      if ('previous' in taskInfoObj) {
        try {
          Tasks.Tasks.move(taskInfoObj.tasklistId, taskInfoObj.id, {
            previous: taskInfoObj.previous,
          });
        } catch (error) {
          const errorObj = {
            error,
            process: 'move_task_in_list',
            taskInfo: taskInfoObj,
          };
          errors.push(errorObj);
        }
      }
      try {
        upsertedTask = Tasks.Tasks.update(
          taskObj,
          taskInfoObj.tasklistId,
          taskInfoObj.id
        );
      } catch (error) {
        const errorObj = {
          error,
          process: 'update_task',
          taskInfo: taskInfoObj,
        };
        errors.push(errorObj);
      }

      // id????????????????????????insert
    } else {
      try {
        upsertedTask = Tasks.Tasks.insert(taskObj, taskInfoObj.tasklistId, {
          parent: taskInfoObj.parent,
        });
      } catch (error) {
        const errorObj = {
          error,
          process: 'insert_task',
          taskInfo: taskInfoObj,
        };
        errors.push(errorObj);
      }
    }
    const tasklistObj = getTasklistObj();
    let upsertedTaskInfo = convTaskToTaskInfo(
      upsertedTask,
      taskInfoObj.tasklistId,
      tasklistObj
    );
    if (beforeId) {
      upsertedTaskInfo.beforeId = beforeId;
    }
    previous.push(upsertedTaskInfo);
    return previous;
  }, []);
  if (errors.length > 0) {
    return JSON.stringify({ errors });
  } else {
    return JSON.stringify({ taskInfos: resTaskInfos });
  }
}

function upsertTasklist(tasklistInfoObj) {
  if (tasklistInfoObj.id) {
    // TODO UPDATE
    Tasks.Tasklists.update(tasklistInfoObj.id, {
      id: tasklistInfoObj.id,
      title: tasklistInfoObj.title,
    });
    // TODO SS??????
  } else {
    Tasks.Tasklists.insert({ title: tasklistInfoObj.title });
  }
  exportAllTasklistToSheet();
  // ?????????????????????????????????????????????
  return getTasklistInfo();
}
