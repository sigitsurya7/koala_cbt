"use client";

import { Input, Button } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";
import { useAuth } from "@/stores/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, error } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => setMounted(true), []);

  const illustrationSrc = useMemo(
    () => (theme === "dark" ? "/koala-login-illustration-dark.png" : "/koala-login-illustration.png"),
    [theme],
  );

  const togglePassword = () => setShowPassword((prev) => !prev);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Identitas dan password wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await login(identifier, password);
      toast.success("Berhasil masuk");
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ? String(err.message) : "Gagal login");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full bg-koala-mint/20 dark:bg-default-100/20">
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white dark:bg-default-100/10 overflow-hidden">
        <img src={illustrationSrc} alt="Koala chill coding" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md p-8 shadow-koala-soft bg-white/70 dark:bg-default-100/10 backdrop-blur-lg rounded-3xl space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-primary">KoalaCBT</h1>
            <p className="text-sm opacity-70 mt-2">Login ke akunmu yuk!</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Username/Email"
              placeholder="Masukkan username/email"
              variant="flat"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              startContent={<FiMail className="text-default-400" />}
              isDisabled={submitting}
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
              isDisabled={submitting}
            />

            {error && <p className="text-danger text-sm">{error}</p>}

            <Button color="primary" className="w-full font-semibold" size="md" type="submit" isLoading={submitting} isDisabled={submitting}>
              Masuk
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

