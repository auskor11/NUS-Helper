document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");
  let selectedIds=new Set();

  function render(){
    const sorted=[...state.tasks].sort((a,b)=>taskDateTime(a)-taskDateTime(b));
    const selectedCount=sorted.filter(t=>selectedIds.has(t.id)).length;

    view.innerHTML=`<div class="section-head">
      <div><h2>Tasks & deadlines</h2><div class="subtle">Add, edit or delete your tasks. Select multiple tasks for bulk deletion.</div></div>
      <div class="action-row">
        <button class="secondary compact" id="selectAllTasks">Select all</button>
        <button class="ghost-btn danger-btn compact" id="deleteSelected" ${selectedCount?"":"disabled"}>Delete selected${selectedCount?` (${selectedCount})`:""}</button>
        <button class="primary" id="addTask">＋ Add task</button>
      </div>
    </div>
    <div class="card"><div class="list">${sorted.length?sorted.map(t=>{
      const i=state.tasks.indexOf(t),over=!t.done&&taskDateTime(t)<new Date(),checked=selectedIds.has(t.id);
      return `<div class="item item-row task-row">
        <div class="task-main">
          <input type="checkbox" class="bulk-task-check task-select" aria-label="Select ${esc(t.title)}" data-id="${esc(t.id)}" ${checked?"checked":""}>
          <div>
            <div class="item-title ${t.done?"completed":""}">${esc(t.title)}</div>
            <div class="item-sub">${esc(t.module||"No module")} · Due ${fmtDate(t.dueDate)}${t.dueTime?` at ${inputTimeToLabel(t.dueTime)}`:""}</div>
          </div>
        </div>
        <div class="task-actions">
          <span class="pill ${over?"warn":""}">${over?"Overdue":t.done?"Done":"Upcoming"}</span>
          <button class="${t.done?"secondary":"primary"} compact complete-task" data-id="${esc(t.id)}">${t.done?"Completed":"Complete"}</button>
          <button class="secondary compact" onclick="editTask('${esc(t.id)}')">Edit</button>
          <button class="ghost-btn danger-btn compact" onclick="deleteTask('${esc(t.id)}')">Delete</button>
        </div>
      </div>`;
    }).join(""):`<div class="empty">No tasks yet.</div>`}</div></div>`;

    $("#addTask").onclick=openTask;
    $("#selectAllTasks").onclick=()=>{
      const all=state.tasks.length>0 && state.tasks.every(t=>selectedIds.has(t.id));
      selectedIds=all?new Set():new Set(state.tasks.map(t=>t.id));
      render();
    };
    $("#deleteSelected").onclick=()=>{
      if(!selectedIds.size)return;
      if(!confirm(`Delete ${selectedIds.size} selected task${selectedIds.size===1?"":"s"}?`))return;
      state.tasks.filter(t=>selectedIds.has(t.id)).forEach(t=>markDeletedId(DELETED_TASKS_KEY,t.id));
      state.tasks=state.tasks.filter(t=>!selectedIds.has(t.id));
      selectedIds.clear();
      save({immediate:true});
      render();
      toast("Selected tasks deleted");
    };

    $$(".bulk-task-check").forEach(cb=>cb.addEventListener("change",()=>{
      if(cb.checked)selectedIds.add(cb.dataset.id);
      else selectedIds.delete(cb.dataset.id);
      render();
    }));
    $$(".complete-task").forEach(btn=>btn.addEventListener("click",()=>{
      const task=state.tasks.find(t=>t.id===btn.dataset.id);
      if(!task)return;
      task.done=!task.done;
      save();
      render();
      toast(task.done?"Task completed":"Task marked incomplete");
    }));
  }

  function taskFormHtml(task){
    const opts=[`<option value="">None</option>`,...state.modules.map(m=>`<option value="${esc(m.code)}" ${task?.module===m.code?"selected":""}>${esc(m.code)} — ${esc(m.name)}</option>`)].join("");
    return `<form class="form" id="taskForm">
      <label>Task<input name="title" value="${esc(task?.title||"")}" placeholder="CS1231S Assignment 1" required></label>
      <label>Module<select name="module">${opts}</select></label>
      <div class="two-col"><label>Deadline date<input type="date" name="dueDate" value="${esc(task?.dueDate||"")}" required></label><label>Deadline time <span class="optional">(optional)</span><input type="time" name="dueTime" value="${esc(task?.dueTime||"")}"></label></div>
      ${task?.done?`<div class="subtle">This task is currently completed. Use the <b>Completed</b> button on the task list to change its status.</div>`:""}
      <button class="primary">${task?"Save changes":"Save task"}</button>
    </form>`;
  }

  function openTask(){
    openModal(`<h2>Add task</h2>${taskFormHtml(null)}`);
    $("#taskForm").onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      const task={title:String(f.get("title")).trim(),module:String(f.get("module")||""),dueDate:String(f.get("dueDate")),dueTime:String(f.get("dueTime")||""),done:false,id:crypto.randomUUID?.()||String(Date.now()+Math.random())};
      clearDeletedId(DELETED_TASKS_KEY,task.id);
      state.tasks.push(task); save(); closeModal(); render(); toast("Task added");
    };
  }

  window.editTask=id=>{
    const task=state.tasks.find(t=>t.id===id); if(!task)return;
    openModal(`<h2>Edit task</h2>${taskFormHtml(task)}`);
    $("#taskForm").onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      Object.assign(task,{
        title:String(f.get("title")).trim(),
        module:String(f.get("module")||""),
        dueDate:String(f.get("dueDate")),
        dueTime:String(f.get("dueTime")||""),
      });
      save(); closeModal(); render(); toast("Task updated");
    };
  };

  window.deleteTask=id=>{
    markDeletedId(DELETED_TASKS_KEY,id);
    state.tasks=state.tasks.filter(t=>t.id!==id);
    selectedIds.delete(id);
    save({immediate:true});
    render();
    toast("Task deleted");
  };

  window.toggleTask=i=>{
    if(!state.tasks[i])return;
    state.tasks[i].done=!state.tasks[i].done; save(); render();
  };

  window.addEventListener("nus-data-changed",()=>render());
  render(); initCommon(); initModal();
});
