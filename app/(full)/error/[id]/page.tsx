"use client"
import { Button } from "@heroui/button";
import { Image } from "@heroui/react";
import { useParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useEffect, useState } from "react";

export default function Error(){
    const params = useParams<{ id: string }>();
    const [leaves, setLeaves] = useState<Array<{id: number, style: any}>>([]);

    // Fungsi untuk membuat daun jatuh (5xx errors)
    useEffect(() => {
        const errorCode = params.id;
        if (errorCode && errorCode.startsWith('5')) {
            const createLeaf = () => {
                const id = Date.now() + Math.random();
                const style = {
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${5 + Math.random() * 5}s`
                };
                return { id, style };
            };

            // Buat daun pertama
            setLeaves([createLeaf()]);

            // Tambah daun setiap 1.5 detik
            const interval = setInterval(() => {
                setLeaves(prev => [...prev.slice(-8), createLeaf()]);
            }, 1500);

            return () => clearInterval(interval);
        }
    }, [params.id]);

    // Fungsi untuk menentukan gambar dan pesan berdasarkan kode error
    const getErrorContent = () => {
        const errorCode = params.id;
        const is4xx = errorCode && errorCode.startsWith('4');
        const is5xx = errorCode && errorCode.startsWith('5');
        const is404 = errorCode === '404';

        switch(errorCode) {
            // 4xx Client Errors - sleepy.svg (koala tidur)
            case "400":
                return {
                    image: "/sleepy.svg",
                    message: "Wah, permintaannya bikin koala ngantuk nih! 😴",
                    code: "400",
                    theme: "cozy"
                };
            case "401":
                return {
                    image: "/sleepy.svg",
                    message: "Koala butuh password eucalyptus dulu nih! 🌿",
                    code: "401",
                    theme: "cozy"
                };
            case "403":
                return {
                    image: "/sleepy.svg",
                    message: "Waduh, koala lagi tidur di area terlarang! 🚫",
                    code: "403",
                    theme: "cozy"
                };
            case "404":
                return {
                    image: "/find.svg",
                    message: "Koala lagi cari-cari eucalyptus yang hilang... 🕵️‍♂️",
                    code: "404",
                    theme: "dry"
                };
            case "405":
                return {
                    image: "/sleepy.svg",
                    message: "Koala belum belajar cara ini, dia masih bayi! 👶",
                    code: "405",
                    theme: "cozy"
                };
            case "408":
                return {
                    image: "/sleepy.svg",
                    message: "Koala ketiduran sambil nunggu... zzzZZZ 💤",
                    code: "408",
                    theme: "cozy"
                };
            case "409":
                return {
                    image: "/sleepy.svg",
                    message: "Dua koala berebut eucalyptus yang sama! 🥊",
                    code: "409",
                    theme: "cozy"
                };
            case "410":
                return {
                    image: "/find.svg",
                    message: "Eucalyptusnya udah habis dimakan koala! 🍃",
                    code: "410",
                    theme: "dry"
                };
            case "418":
                return {
                    image: "/sleepy.svg",
                    message: "Koala bukan teapot, dia pemakan eucalyptus! 🍵",
                    code: "418",
                    theme: "cozy"
                };
            case "429":
                return {
                    image: "/sleepy.svg",
                    message: "Wah, koala kewalahan, kebanyakan request! 🎪",
                    code: "429",
                    theme: "cozy"
                };

            // 5xx Server Errors - panic.svg (koala panic)
            case "500":
                return {
                    image: "/panic.svg",
                    message: "Aduh! Server koala lagi kacau balau! 🚨",
                    code: "500",
                    theme: "falling"
                };
            case "501":
                return {
                    image: "/panic.svg",
                    message: "Fitur ini belum diajarkan ke koala! 📚",
                    code: "501",
                    theme: "falling"
                };
            case "502":
                return {
                    image: "/panic.svg",
                    message: "Gateway bikin koala bingung tujuh keliling! 🌀",
                    code: "502",
                    theme: "falling"
                };
            case "503":
                return {
                    image: "/panic.svg",
                    message: "Koala lagi sibuk makan eucalyptus dulu! 🍽️",
                    code: "503",
                    theme: "falling"
                };
            case "504":
                return {
                    image: "/panic.svg",
                    message: "Koala nungguinnya kelamaan, jadi panik! ⏰",
                    code: "504",
                    theme: "falling"
                };
            case "507":
                return {
                    image: "/panic.svg",
                    message: "Waduh, koala kehabisan tempat simpan eucalyptus! 📦",
                    code: "507",
                    theme: "falling"
                };
            case "508":
                return {
                    image: "/panic.svg",
                    message: "Koala muter-muter terus, pusing deh! 🎠",
                    code: "508",
                    theme: "falling"
                };

            // Find.svg untuk error pencarian/not found lainnya
            case "406":
                return {
                    image: "/find.svg",
                    message: "Koala cuma terima eucalyptus segar! 🌱",
                    code: "406",
                    theme: "dry"
                };
            case "407":
                return {
                    image: "/find.svg",
                    message: "Koala butuh izin khusus buat lewat sini! 🛂",
                    code: "407",
                    theme: "dry"
                };
            case "411":
                return {
                    image: "/find.svg",
                    message: "Koala perlu tahu seberapa besar eucalyptusnya! 📏",
                    code: "411",
                    theme: "dry"
                };
            case "412":
                return {
                    image: "/find.svg",
                    message: "Eucalyptusnya kurang segar buat koala! 🌿",
                    code: "412",
                    theme: "dry"
                };
            case "413":
                return {
                    image: "/find.svg",
                    message: "Eucalyptusnya kegedean, koala gak bisa angkat! 🏋️",
                    code: "413",
                    theme: "dry"
                };
            case "414":
                return {
                    image: "/find.svg",
                    message: "Alamatnya kepanjangan, koala gak bisa baca! 📜",
                    code: "414",
                    theme: "dry"
                };
            case "415":
                return {
                    image: "/find.svg",
                    message: "Koala cuma kenal eucalyptus, bukan yang lain! ❌",
                    code: "415",
                    theme: "dry"
                };
            case "416":
                return {
                    image: "/find.svg",
                    message: "Sepertinya eucalyptusnya kurang pas nih! 📐",
                    code: "416",
                    theme: "dry"
                };
            case "417":
                return {
                    image: "/find.svg",
                    message: "Koala kecewa, ekspektasinya tidak terpenuhi! 😞",
                    code: "417",
                    theme: "dry"
                };

            default:
                return {
                    image: "/panic.svg",
                    message: "Wah, koala bingung ada apa ini! 🤷‍♂️",
                    code: errorCode || "Unknown",
                    theme: is4xx ? "cozy" : is5xx ? "falling" : "dry"
                };
        }
    };

    const errorContent = getErrorContent();

    // Background berdasarkan theme
    const getBackgroundClass = () => {
        switch(errorContent.theme) {
            case "cozy":
                return "bg-gradient-to-br from-green-50 via-blue-50 to-purple-50";
            case "dry":
                return "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100";
            case "falling":
                return "bg-gradient-to-br from-gray-100 via-slate-100 to-stone-200";
            default:
                return "bg-gradient-to-br from-gray-50 to-blue-50";
        }
    };

    return(
        <div className={`w-full h-screen flex flex-col gap-12 justify-center items-center relative overflow-hidden transition-all duration-1000`}>
            
            {/* Daun jatuh untuk error 5xx */}
            {errorContent.theme === "falling" && leaves.map(leaf => (
                <div
                    key={leaf.id}
                    className="absolute top-0 text-2xl opacity-60 animate-falling-leaf pointer-events-none"
                    style={leaf.style}
                >
                    🍂
                </div>
            ))}

            {/* Efek gersang untuk not found */}
            {errorContent.theme === "dry" && (
                <>
                    <div className="absolute bottom-10 left-10 text-3xl opacity-40 animate-pulse">🌵</div>
                    <div className="absolute top-20 right-20 text-2xl opacity-30 animate-pulse delay-1000">🍂</div>
                    <div className="absolute top-1/3 left-20 text-xl opacity-50 animate-pulse delay-500">🏜️</div>
                </>
            )}

            {/* Efek cozy untuk 4xx */}
            {errorContent.theme === "cozy" && (
                <>
                    <div className="absolute top-5 left-1/4 text-2xl opacity-40 animate-bounce">🛋️</div>
                    <div className="absolute bottom-20 right-16 text-3xl opacity-50 animate-pulse delay-700">☕</div>
                    <div className="absolute top-1/3 right-20 text-xl opacity-60 animate-bounce delay-300">📚</div>
                    <div className="absolute bottom-1/4 left-20 text-2xl opacity-40 animate-pulse delay-1200">💤</div>
                </>
            )}

            <div className="flex flex-col items-center text-center z-10">
                <Image 
                    isBlurred 
                    isZoomed 
                    src={errorContent.image} 
                    alt={`${errorContent.message} Error`} 
                    width={200} 
                    height={120} 
                    className={`filter grayscale opacity-70 transition-all duration-500 ${
                        errorContent.theme === "cozy" ? "hover:grayscale-0 hover:opacity-100" :
                        errorContent.theme === "dry" ? "hover:opacity-90" :
                        "hover:grayscale-50"
                    }`} 
                />
                <span className="text-xl mt-4">
                    {errorContent.message} 
                </span>
                <span className={`p-2 rounded-md mt-2 text-white font-semibold ${
                    errorContent.theme === "cozy" ? "bg-blue-500" :
                    errorContent.theme === "dry" ? "bg-amber-600" :
                    "bg-red-500"
                }`}>
                    {errorContent.code}
                </span>
            </div>

            <Button 
                onPress={() => (window.location.href = "/")} 
                startContent={<FiArrowLeft />} 
                variant="light"
                className={`mt-4 ${
                    errorContent.theme === "cozy" ? "bg-white/50" :
                    errorContent.theme === "dry" ? "bg-amber-100/50" :
                    "bg-gray-100/50"
                }`}
            >
                Kembali ke dashboard
            </Button>
        </div>
    )
}