"use client"
import { Button } from "@heroui/button";
import { Image } from "@heroui/react";
import { useParams } from "next/navigation";
import { FiHome, FiRefreshCw } from "react-icons/fi";
import { useState } from "react";

export default function Error(){
    const params = useParams<{ id: string }>();
    const [isInteractive, setIsInteractive] = useState(false);

    // Fungsi untuk menentukan gambar dan pesan berdasarkan kode error
    const getErrorContent = () => {
        const errorCode = params.id;

        switch(errorCode) {
            case "400":
                return {
                    image: "/sleepy.svg",
                    message: "Permintaan bikin koala ngantuk 😴",
                    code: "400",
                    color: "blue"
                };
            case "401":
                return {
                    image: "/sleepy.svg", 
                    message: "Butuh password eucalyptus dulu 🌿",
                    code: "401",
                    color: "green"
                };
            case "403":
                return {
                    image: "/sleepy.svg",
                    message: "Area terlarang untuk koala 🚫",
                    code: "403", 
                    color: "orange"
                };
            case "404":
                return {
                    image: "/find.svg",
                    message: "Lagi cari eucalyptus yang hilang 🕵️‍♂️",
                    code: "404",
                    color: "yellow"
                };
            case "500":
                return {
                    image: "/panic.svg", 
                    message: "Server koala lagi kacau balau! 🚨",
                    code: "500",
                    color: "red"
                };
            case "503":
                return {
                    image: "/panic.svg",
                    message: "Lagi sibuk makan eucalyptus 🍽️",
                    code: "503",
                    color: "purple"
                };
            default:
                return {
                    image: "/panic.svg",
                    message: "Koala bingung ada apa ini 🤷‍♂️",
                    code: errorCode || "Unknown",
                    color: "gray"
                };
        }
    };

    const errorContent = getErrorContent();
    const colorClasses = {
        blue: "from-blue-50 to-blue-100",
        green: "from-green-50 to-green-100", 
        orange: "from-orange-50 to-orange-100",
        yellow: "from-amber-50 to-amber-100",
        red: "from-red-50 to-red-100",
        purple: "from-purple-50 to-purple-100",
        gray: "from-gray-50 to-gray-100"
    };

    return(
        <div className={`w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br ${colorClasses[errorContent.color]} transition-colors duration-500`}>
            
            {/* Main Content */}
            <div className="flex flex-col items-center text-center p-8 max-w-sm">
                {/* Interactive Koala */}
                <div 
                    className="relative mb-8 cursor-pointer"
                    onMouseEnter={() => setIsInteractive(true)}
                    onMouseLeave={() => setIsInteractive(false)}
                    onClick={() => setIsInteractive(!isInteractive)}
                >
                    <Image 
                        src={errorContent.image} 
                        alt={`${errorContent.message} Error`} 
                        width={120}
                        height={80}
                        className={`transition-all duration-300 ${
                            isInteractive 
                                ? 'scale-110 rotate-2 filter-none opacity-100' 
                                : 'scale-100 filter grayscale opacity-70'
                        }`} 
                    />
                </div>

                {/* Error Message */}
                <div className="space-y-4 mb-8">
                    <div className="px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
                        <p className="text-lg text-gray-700 font-medium">
                            {errorContent.message}
                        </p>
                    </div>
                    
                    <div className={`px-4 py-2 bg-${errorContent.color}-200 rounded-full inline-block`}>
                        <span className="text-sm font-semibold text-gray-800">
                            Error {errorContent.code}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full">
                    <Button 
                        onPress={() => (window.location.href = "/")} 
                        startContent={<FiHome />} 
                        variant="flat"
                    >
                        Home
                    </Button>
                    
                    <Button 
                        onPress={() => window.location.reload()} 
                        startContent={<FiRefreshCw />} 
                        variant="flat" 
                    >
                        Coba Lagi
                    </Button>
                </div>

                {/* Simple Footer */}
                <div className="mt-8">
                    <p className="text-gray-500 text-sm">
                        Jangan sedih, koala tetap sayang kamu 💚
                    </p>
                </div>
            </div>

            {/* Minimal Background Elements */}
            <div className="absolute bottom-4 text-gray-400 text-xs">
                Klik koala untuk interaksi!
            </div>
        </div>
    )
}