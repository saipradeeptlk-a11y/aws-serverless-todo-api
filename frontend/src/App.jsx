import { useEffect, useState } from "react";
import { getTasks, createTasks, deleteTasks, updateTasks } from "./api/tasksApi";
import { TaskForm } from "./components/TaskForm";
import { SignInPage } from "./components/SignInPage";
import { getIdToken,signOut } from "./auth/cognito";
import { Checking } from "./components/checkingPage";
import "./App.css";

const statusLabels = {
  not_started: "Not started",
  pending: "Pending",
  completed: "Completed",
};
const themes = [
  { name: "Teal", value: "#0d9488" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Rose", value: "#e11d48" },
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [showStatus, setShowStatus] = useState(null);
  const [Colours, setColours] = useState("#0d9488");
  const [logStatus, setLogStatus] = useState("checking");

  // 1. Runs once on load: is anyone already signed in?
  useEffect(() => {
    const check = async () => {
      const token = await getIdToken();
      setLogStatus(token ? "Logged" : "LoggedOff");
    };
    check();
  }, []);

  // 2. Whenever the chosen color changes, put it into the --accent "bucket" in CSS
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", Colours);
  }, [Colours]);

  // 3. Load tasks only once the user is logged in (and again if the status changes)
  useEffect(() => {
    if (logStatus !== "Logged") return;

    const getData = async () => {
      try {
        const data = await getTasks();
        setTasks(data);
        setError("");
      } catch (err) {
        setError(err.message);
        console.log(err);
      }
    };
    getData();
  }, [logStatus]);

  const formatDate = (date) => {
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11 ? "st" :
      day % 10 === 2 && day !== 12 ? "nd" :
      day % 10 === 3 && day !== 13 ? "rd" : "th";

    const month = date.toLocaleDateString("en-GB", {
      month: "long",
    });

    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

   const handleSignOut = () => {
    signOut();
    setTasks([]);
    setError("");
    setShowStatus(null);
    setLogStatus("LoggedOff");
  };

  const AddOn = async (title, status) => {
    if (!title.trim()) {
      alert("Title is missing");
      return;
    }

    try {
      const newdata = await createTasks(title, status);
      setTasks((prev) => [...prev, newdata]);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeTask = async (id) => {
    try {
      await deleteTasks(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      const updated = await updateTasks(status, id);
      setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
      setShowStatus(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const changeColor = (value) => {
    setColours(value);
  };

  // Gate: decide which "room" to show
  if (logStatus === "checking") {
    return (
      <main className="page">
        <Checking />
      </main>
    );
  }

  if (logStatus === "LoggedOff") {
    return (
      <main className="page">
        <SignInPage setLogStatus={setLogStatus} />
      </main>
    );
  }

  // logStatus === "Logged": the task page
  return (
    <main className="page">
      <div>
        <header className="hero">
          <p className="eyebrow">Today's plan</p>
          <div className="theme-picker">
            <label className="theme-label" htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              className="theme-select"
              value={Colours}
              onChange={(e) => changeColor(e.target.value)}
            >
              {themes.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <h1 className="hero-title">{formatDate(new Date())}</h1>
          <p className="hero-sub">
            Here are your tasks for the day. Stay focused and take it one step at a time.
          </p>
        </header>

        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">My tasks</h2>
              <p className="card-sub">
                {tasks.filter((t) => t.status === "completed").length} of {tasks.length} completed
              </p>
            </div>
            <span className="card-count">{tasks.length}</span>
          </div>

          <TaskForm Addon={AddOn} />

          {error && <p className="error" role="alert">{error}</p>}

          <ul className="task-list">
            {tasks.map((item) => (
              <li
                key={item.id}
                className={`task-item ${item.status === "completed" ? "task-item--done" : ""}`}
              >
                <div className="task-main">
                  <span className="task-title">{item.title}</span>

                  {showStatus === item.id ? (
                    <select
                      className="status-select"
                      value={item.status}
                      onChange={(e) => changeStatus(item.id, e.target.value)}
                    >
                      <option value="not_started">Not yet started</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <span className={`badge badge--${item.status}`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  )}
                </div>

                <div className="task-actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setShowStatus(item.id)}>
                    Update
                  </button>
                  <button type="button" className="btn btn--danger" onClick={() => removeTask(item.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {tasks.length === 0 && !error && (
            <p className="empty">Nothing here yet. Add your first task above.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;