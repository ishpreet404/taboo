'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DonatePage() {
    const router = useRouter()
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const paymentOptions = [
        {
            id: 'venmo',
            name: 'Venmo',
            tag: '@anshlaw',
            color: 'from-blue-300 to-cyan-300',
            icon: '💵',
            image: '/venmo-qr.png' // Add your QR code or payment image here
        },
        {
            id: 'cashapp',
            name: 'Cash App',
            tag: '$AnshLaw',
            color: 'from-green-500 to-emerald-500',
            icon: '💰',
            image: '/cashapp-qr.png' // Add your QR code or payment image here
        },
        {
            id: 'paypal',
            name: 'PayPal',
            tag: '@anshlaw55',
            color: 'from-blue-300 to-indigo-300',
            icon: '💳',
            image: '/paypal-qr.png' // Add your QR code or payment image here
        },
        {
            id: 'upi',
            name: 'UPI',
            tag: 'anshraj65@oksbi',
            color: 'from-orange-500 to-red-500',
            icon: '🇮🇳',
            image: '/upi-qr.png' // Add your QR code or payment image here
        }
    ]

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="min-h-screen p-4 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="flex justify-center mb-4"
                    >
                        <Heart className="w-16 h-16 text-red-400 fill-red-400" />
                    </motion.div>
                    <motion.h1
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-transparent"
                    >
                        Support Taboo
                    </motion.h1>
                    <p className="text-gray-300 text-base md:text-lg max-w-xl mx-auto">
                        If you enjoy playing Taboo and want to support our work, consider making a donation. Every contribution helps us keep the game running and improving!
                    </p>
                </div>

                {/* Payment Options */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-strong rounded-2xl p-6 md:p-8 space-y-4"
                >
                    {paymentOptions.map((option, index) => (
                        <motion.div
                            key={option.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="glass rounded-xl p-4 md:p-6 hover:scale-105 transition-all"
                        >
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <span className="text-3xl md:text-4xl">{option.icon}</span>
                                    <div className="flex-1">
                                        <h3 className={`text-lg md:text-xl font-bold bg-gradient-to-r ${option.color} bg-clip-text text-transparent`}>
                                            {option.name}
                                        </h3>
                                        <p className="text-gray-300 text-sm md:text-base font-mono">
                                            {option.tag}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(option.tag, option.id)}
                                        className={`p-3 rounded-lg transition-all ${copiedId === option.id
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                        title="Copy to clipboard"
                                    >
                                        {copiedId === option.id ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <Copy className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {option.image && (
                                    <div className="w-full md:w-auto flex justify-center">
                                        <img
                                            src={option.image}
                                            alt={`${option.name} QR Code`}
                                            className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover border-2 border-white/20"
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Thank You Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 text-center"
                >
                    <p className="text-gray-400 text-sm md:text-base">
                        Thank you for your generosity! 🙏
                    </p>
                </motion.div>

                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-6"
                >
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 md:py-4 px-6 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-sm md:text-base"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Game
                    </button>
                </motion.div>
            </motion.div>
        </div>
    )
}
