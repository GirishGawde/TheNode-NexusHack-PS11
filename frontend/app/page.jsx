"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Rocket, Trophy } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-[#0A0A0F] to-cyan-900/20 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
          NexusHack
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          The all-in-one platform for managing hackathons and technical events end-to-end.
        </p>
      </motion.div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full flex flex-col hover:border-violet-500/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center mb-4">
                <Rocket className="text-violet-400" />
              </div>
              <CardTitle className="text-2xl">I'm a Participant</CardTitle>
              <CardDescription>
                Join hackathons, form teams, submit projects, and climb the leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="flex gap-4">
              <Button asChild className="w-full">
                <Link href="/login/participant">Login</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/register/participant">Register</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full flex flex-col hover:border-cyan-500/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                <Trophy className="text-cyan-400" />
              </div>
              <CardTitle className="text-2xl">I'm an Organiser</CardTitle>
              <CardDescription>
                Create events, manage participants, assign judges, and publish results.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="flex gap-4">
              <Button asChild variant="outline" className="w-full hover:bg-cyan-900/30 hover:text-cyan-400">
                <Link href="/login/organiser">Login</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/register/organiser">Register</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="z-10 mt-16 text-center text-slate-500 text-sm"
      >
        Powered by NexusHack Platform
      </motion.div>
    </div>
  )
}
