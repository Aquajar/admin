import { jwtVerify } from "jose";

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

export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today: Date = new Date(); // Get current date
  for (let i = 0; i < n; i++) {
    const date: Date = new Date(today);
    date.setDate(today.getDate() - i); // Subtract i days from current date
    dates.push(date.toLocaleDateString());
  }
  return dates;
}

// Get greetings
const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return "Good Morning";
  } else if (currentHour >= 12 && currentHour < 18) {
    return "Good Afternoon";
  } else {
    return "Good Evening";
  }
};

export { randomString, getGreeting };
