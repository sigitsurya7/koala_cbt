"use client";

import { Input, Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";
import { useAuth } from "@/stores/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useTheme } from "next-themes";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, error } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme(); // 🪄 Ambil tema aktif

  useEffect(() => setMounted(true), []);

  if (!mounted) return null; 

  const illustrationSrc =
    theme === "dark"
      ? "/koala-login-illustration-dark.png"
      : "/koala-login-illustration.png";

  const togglePassword = () => setShowPassword(!showPassword);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await toast.promise(
        login(email, password),
        {
          loading: "Memproses login...",
          success: "Berhasil masuk",
          error: (err) => (err?.message ? String(err.message) : "Gagal login"),
        },
      );
      // Arahkan langsung ke dashboard
      router.replace("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-koala-mint/20 dark:bg-default-100/20">
      {/* Left Side Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white dark:bg-default-100/10 overflow-hidden">
        <img
          src={illustrationSrc}
          alt="Koala chill coding"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Side Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md p-8 shadow-koala-soft bg-white/70 dark:bg-default-100/10 backdrop-blur-lg rounded-3xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-primary">KoalaCBT</h1>
            <p className="text-sm opacity-70 mt-2">Login ke akunmu yuk!</p>
          </div>

          {/* Input Email & Password */}
          <div className="space-y-5">
            <Input
              label="Email"
              placeholder="Masukkan email"
              variant="flat"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startContent={<FiMail className="text-default-400" />}
            />

            <Input
              label="Password"
              placeholder="Masukkan password"
              variant="flat"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={<FiLock className="text-default-400" />}
              endContent={
                <Button type="button" variant="light" onClick={togglePassword} isIconOnly>
                  {showPassword ? <FiEyeOff className="text-default-400" /> : <FiEye className="text-default-400" />}
                </Button>
              }
            />

            {error && <p className="text-danger text-sm">{error}</p>}

            <Button color="primary" className="w-full font-semibold mt-2" size="md" type="submit" isLoading={submitting} isDisabled={submitting}>
              Masuk
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
