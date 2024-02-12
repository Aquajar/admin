import { jwtVerify } from "jose";

export const getJwtSecretKey = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret || secret.length === 0) {
    throw new Error("The env variable ACCESS_TOKEN_SECRET is not defined");
  }
  return secret;
};

export const verifyJWTToken = async (token: string) => {
  try {
    return jwtVerify(token, new TextEncoder().encode(getJwtSecretKey()));
  } catch (err) {
    throw new Error("Your token has expired");
  }
};

function randomString(length: number) {
  return Math.round(
    Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)
  )
    .toString(36)
    .slice(1);
}

export { randomString };
