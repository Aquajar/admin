import { jwtVerify } from "jose";
import CryptoJS from 'crypto-js';


// Encrypt data
export const encryptData = (data: string, secretKey: string): string => {
  const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
  return encryptedData;
};

// Decrypt data
export const decryptData = (encryptedData: string, secretKey: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedData;
};


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

// Date object is converted into a human-readable format
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();

  const seconds = Math.floor(diffInMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // If the date is more than 1 day ago, show the exact date
  if (days > 1) {
    const dateFormat = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return dateFormat.format(date); // e.g., "22 Nov 2024"
  } else if (days === 1) {
    return "Yesterday";
  } else if (hours > 1) {
    return `${hours} hours ago`;
  } else if (hours === 1) {
    return "1 hour ago";
  } else if (minutes > 1) {
    return `${minutes} mins ago`;
  } else if (minutes === 1) {
    return "1 min ago";
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else {
    return "Just now";
  }
}

export { randomString, getGreeting };
