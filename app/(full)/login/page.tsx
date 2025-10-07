"use client";

import { Input, Button, Card } from "@heroui/react";
import { useState } from "react";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="flex h-screen w-full bg-koala-mint/20 dark:bg-default-100/20">
      {/* 🐨 Left Side Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white dark:bg-default-100/10">
        <img
          src="/koala-login-illustration.png"
          alt="Koala chill coding"
          className="object-contain"
        />
      </div>

      {/* ✨ Right Side Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md p-8 shadow-koala-soft bg-white/70 dark:bg-default-100/10 backdrop-blur-lg rounded-3xl">
          {/* Logo & Text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-primary">KoalaCBT</h1>
            <p className="text-sm opacity-70 mt-2">Login ke akunmu yuk!</p>
          </div>

          {/* Input Email/Username */}
          <div className="space-y-5">
            <Input
              label="Email atau Username"
              placeholder="Masukkan email atau username"
              variant="bordered"
              color="primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startContent={<FiMail className="text-default-400" />}
            />

            {/* Input Password */}
            <Input
              label="Password"
              placeholder="Masukkan password"
              variant="bordered"
              color="primary"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={<FiLock className="text-default-400" />}
              endContent={
                <Button
                  type="button"
                  variant="light"
                  onClick={togglePassword}
                  isIconOnly
                >
                  {showPassword ? (
                    <FiEyeOff className="text-default-400" />
                  ) : (
                    <FiEye className="text-default-400" />
                  )}
                </Button>
              }
            />

            {/* Tombol Login */}
            <Button
              color="primary"
              className="w-full font-semibold mt-4"
              size="md"
            >
              Masuk
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
