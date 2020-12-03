$(document).ready(function() {
    const apiRoot = 'https://shielded-reef-52214.herokuapp.com/v1/task/';
    const trelloApiRoot = 'https://shielded-reef-52214.herokuapp.com/v1/trello/';
    const datatableRowTemplate = $('[data-datatable-row-template]').children()[0];
    const $tasksContainer = $('[data-tasks-container]');
 
    let availableBoards = {};
    let availableTasks = {};
 
    // init
 
    getAllTasks();
 
    function getAllAvailableBoards(callback, callbackArgs) {
       var requestUrl = trelloApiRoot + 'getTrelloBoards';
 
       $.ajax({
          url: requestUrl,
          method: 'GET',
          contentType: 'application/json',
          success: function(boards) { callback(callbackArgs, boards); }
      });
    }
 
    function createElement(data) {
       const element = $(datatableRowTemplate).clone();
 
       element.attr('data-task-id', data.id);
       element.find('[data-task-name-section] [data-task-name-paragraph]').text(data.title);
       element.find('[data-task-name-section] [data-task-name-input]').val(data.title);
 
       element.find('[data-task-content-section] [data-task-content-paragraph]').text(data.content);
       element.find('[data-task-content-section] [data-task-content-input]').val(data.content);
 
       return element;
    }
 
    function prepareBoardOrListSelectOptions(availableChoices) {
       return availableChoices.map(function(choice) {
          return $('<option>')
             .addClass('crud-select__option')
             .val(choice.id)
             .text(choice.name || 'Unknown name');
      });
    }
 
    function handleDatatableRender(taskData, boards) {
       $tasksContainer.empty();
       boards.forEach(board => {
          availableBoards[board.id] = board;
       });
 
      taskData.forEach(function(task) {
         let $datatableRowEl = createElement(task);
         let $availableBoardsOptionElements = prepareBoardOrListSelectOptions(boards);
 
         $datatableRowEl.find('[data-board-name-select]')
            .append($availableBoardsOptionElements);
 
         $datatableRowEl
           .appendTo($tasksContainer);
      });
    }
 
    function getAllTasks() {
       const requestUrl = apiRoot + 'getTasks';
 
       $.ajax({
          url: requestUrl,
          method: 'GET',
          contentType: "application/json",
          success: function(tasks) {
             tasks.forEach(task => {
                availableTasks[task.id] = task;
             });
 
          getAllAvailableBoards(handleDatatableRender, tasks);
          }
       });
    }
 
    function handleTaskUpdateRequest() {
       let parentEl = $(this).parents('[data-task-id]');
       let taskId = parentEl.attr('data-task-id');
       let taskTitle = parentEl.find('[data-task-name-input]').val();
       let taskContent = parentEl.find('[data-task-content-input]').val();
       let requestUrl = apiRoot + 'updateTask';
 
       $.ajax({
          url: requestUrl,
          method: "PUT",
          processData: false,
          contentType: "application/json; charset=utf-8",
          dataType: 'json',
          data: JSON.stringify({
            id: taskId,
            title: taskTitle,
            content: taskContent
          }),
          success: function(data) {
             parentEl.attr('data-task-id', data.id).toggleClass('datatable__row--editing');
             parentEl.find('[data-task-name-paragraph]').text(taskTitle);
             parentEl.find('[data-task-content-paragraph]').text(taskContent);
          }
       });
    }
 
    function handleTaskDeleteRequest() {
       let parentEl = $(this).parents('[data-task-id]');
       let taskId = parentEl.attr('data-task-id');
       let requestUrl = apiRoot + 'deleteTask';
 
       $.ajax({
          url: requestUrl + '/?' + $.param({
             taskId: taskId
          }),
          method: 'DELETE',
          success: function() {
             parentEl.slideUp(400, function() { parentEl.remove(); });
          }
       })
    }
 
    function handleTaskSubmitRequest(event) {
       event.preventDefault();
 
       let taskTitle = $(this).find('[name="title"]').val();
       let taskContent = $(this).find('[name="content"]').val();
 
       let requestUrl = apiRoot + 'createTask';
 
       $.ajax({
          url: requestUrl,
          method: 'POST',
          processData: false,
          contentType: "application/json; charset=utf-8",
          dataType: 'json',
          data: JSON.stringify({
             title: taskTitle,
             content: taskContent
          }),
         complete: function(data) {
            if (data.status === 200) {
               getAllTasks();
            }
         }
       });
    }
 
    function toggleEditingState() {
       var parentEl = $(this).parents('[data-task-id]');
       parentEl.toggleClass('datatable__row--editing');
 
       let taskTitle = parentEl.find('[data-task-name-paragraph]').text();
       let taskContent = parentEl.find('[data-task-content-paragraph]').text();
 
       parentEl.find('[data-task-name-input]').val(taskTitle);
       parentEl.find('[data-task-content-input]').val(taskContent);
    }
 
    function handleBoardNameSelect(event) {
       let $changedSelectEl = $(event.target);
       let selectedBoardId = $changedSelectEl.val();
       let $listNameSelectEl = $changedSelectEl.siblings('[data-list-name-select]');
       let preparedListOptions = prepareBoardOrListSelectOptions(availableBoards[selectedBoardId].lists);
 
       $listNameSelectEl.empty().append(preparedListOptions);
    }
 
    function handleCardCreationRequest(event) {
       let requestUrl = trelloApiRoot + 'createTrelloCard';
       let $relatedTaskRow = $(event.target).parents('[data-task-id]');
       let relatedTaskId = $relatedTaskRow.attr('data-task-id');
       let relatedTask = availableTasks[relatedTaskId];
       let selectedListId = $relatedTaskRow.find('[data-list-name-select]').val();
 
       if (!selectedListId) {
          alert('You have to select a board and a list first!');
          return;
       }
 
       $.ajax({
          url: requestUrl,
          method: 'POST',
          processData: false,
          contentType: "application/json; charset=utf-8",
          dataType: 'json',
          data: JSON.stringify({
          name: relatedTask.title,
             desc: relatedTask.content,
             idList: selectedListId
          }),
          success: function(data) {
             console.log('Card created - ' + data.shortUrl);
             alert('Card created - ' + data.shortUrl);
          }
        });
    }
 
    $('[data-task-add-form]').on('submit', handleTaskSubmitRequest);
 
    $tasksContainer.on('change','[data-board-name-select]', handleBoardNameSelect);
    $tasksContainer.on('click','[data-trello-card-creation-trigger]', handleCardCreationRequest);
    $tasksContainer.on('click','[data-task-edit-button]', toggleEditingState);
    $tasksContainer.on('click','[data-task-edit-abort-button]', toggleEditingState);
    $tasksContainer.on('click','[data-task-submit-update-button]', handleTaskUpdateRequest);
    $tasksContainer.on('click','[data-task-delete-button]', handleTaskDeleteRequest);
 });