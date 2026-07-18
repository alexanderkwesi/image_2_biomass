// front-end/src/App.js
import { BrowserRouter as Router } from "react-router-dom";
import "./app.css";
import AppRoutes from  "./start/app/AuthRoutes"; // Import the consolidated routes

const App = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
