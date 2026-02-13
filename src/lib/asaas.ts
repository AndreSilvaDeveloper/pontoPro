import axios from "axios";

export const asaas = axios.create({
  baseURL: process.env.ASAAS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    access_token: process.env.ASAAS_API_KEY || "",
  },
});
