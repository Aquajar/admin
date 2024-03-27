import axios from "axios";
import { setCookie } from "cookies-next";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import OTPInput from "react-otp-input";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [hasSentOTP, setHasSentOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  //   SEND OTP REQUEST TO SERVER
  const handleOnRequestOtp = async () => {
    setLoading(true);
    const URL = process.env.NEXT_PUBLIC_API_URL + "/auth/code";

    const payload = {
      phone: phone,
    };

    const promise = axios.post(URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Handle promise lifecycle
    toast.promise(
      promise,
      {
        loading: "Sending OTP",
        success: (res) => {
          setHasSentOTP(true);
          setLoading(false);
          return "OTP sent successfully";
        },
        error: (err) => {
          console.log(err);
          return err.message;
        },
      },
      {
        style: {
          minWidth: "250px",
        },
      }
    );
  };

  //  VERIFY OTP REQUEST TO SERVER
  const handleOnVerifyOtp = async () => {
    setLoading(true);
    const promise = signIn("credentials", {
      phone: phone,
      otp: otp,
      redirect: false,
    });

    // Handle promise lifecycle
    toast.promise(
      promise,
      {
        loading: "Verifying OTP",
        success: (res) => {
          router.push("/");
          setLoading(false);
          return "OTP verified successfully";
        },
        error: (err) => {
          console.log(err);
          return err.message;
        },
      },
      {
        style: {
          minWidth: "250px",
        },
      }
    );
  };

  return (
    <div className="flex  justify-center h-screen px-5 md:px-0 ">
      <div className="p-5 bg-white flex flex-col w-full md:w-[30%] font-mono h-fit mt-40 rounded-lg">
        <div className="flex w-full items-center mb-2">
          <Image
            src="/images/logo.png"
            priority
            alt="logo"
            width={50}
            height={50}
          />
          <h1 className="text-2xl font-medium ml-5 w-full">Admin Login</h1>
        </div>
        {hasSentOTP ? (
          <OTPInput
            value={otp}
            onChange={setOtp}
            numInputs={6}
            inputStyle={{
              width: "2.5rem",
              height: "2.5rem",
              margin: "0.3rem",
              fontSize: "1.5rem",
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,0.3)",
            }}
            containerStyle={{
              justifyContent: "center",
              marginTop: "2.8rem",
              marginBottom: "0.5rem",
            }}
            // renderSeparator={<span>-</span>}
            renderInput={(props) => <input {...props} />}
          />
        ) : (
          <div className="flex flex-col mt-5">
            <label className="text-lg font-normal">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="text"
              className="border text-lg border-gray-300 rounded-lg py-2 px-3 mt-1"
            />
          </div>
        )}
        <span className="text-xs text-gray-500 w-full text-center mt-1">
          {hasSentOTP
            ? "Enter the OTP sent to your phone number"
            : "You will receive an OTP on the given number"}
        </span>
        <button
          onClick={hasSentOTP ? handleOnVerifyOtp : handleOnRequestOtp}
          disabled={hasSentOTP && phone.length !== 10 || loading}
          className="bg-primary text-white rounded-lg p-3 mt-6 disabled:opacity-70"
        >
          {hasSentOTP ? "Verify OTP" : "Send OTP"}
        </button>
      </div>
    </div>
  );
};

export default Login;
