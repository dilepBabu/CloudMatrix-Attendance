import axios from "axios";

const api = axios.create({
  baseURL: "https://cloudmatrix-attendance.onrender.com/api",
  withCredentials: true,
});

export default api;