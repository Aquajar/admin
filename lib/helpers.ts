import { jwtVerify } from "jose";
import axios from "axios";

export const getJwtSecretKey = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret || secret.length === 0) {
    throw new Error("The env variable ACCESS_TOKEN_SECRET is not defined");
  }
  return secret;
};

// Verify JWT Token
export const verifyJWTToken = async (token: string) => {
  try {
    return jwtVerify(token, new TextEncoder().encode(getJwtSecretKey()));
  } catch (err) {
    throw new Error("Your token has expired");
  }
};

// Generate a random string
function randomString(length: number) {
  return Math.round(
    Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)
  )
    .toString(36)
    .slice(1);
}

class axiosRequest {
  constructor() {
    this.get = this.get.bind
  }

  async get(url: string) {
    return await axios.get(url);
  }

  async post(url: string, data: any) {
    return await axios.post(url, data);
  }

  async put(url: string, data: any) {
    return await axios.put(url, data);
  }

  async delete(url: string) {
    return await axios.delete(url);
  }
}

export { randomString };
