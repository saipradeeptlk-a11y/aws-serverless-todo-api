import {useState} from "react";
export  function TaskForm({Addon}){
    const [title,setTitle] = useState("Task");
    const [status,setStatus] = useState("completed"); 
    const handleSubmit = async (e) => {
        e.preventDefault();
        Addon(title,status);
    }
  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label className="field field--title">
        <span className="field-icon" aria-hidden="true">✎</span>
        <input
          className="task-input"
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing today?"
        />
      </label>

      <label className="field field--status">
        <span className="field-label">Status</span>
        <select
          className="status-select"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="not_started">Not yet started</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </label>

      <button type="submit" className="btn btn--primary">
        Add task <span aria-hidden="true">+</span>
      </button>
    </form>
  );
}