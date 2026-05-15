"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Rocket, Trophy } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >


      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight" style={{ color: "var(--accent)", letterSpacing: "-0.03em" }}>
          Nexus<span style={{ color: "var(--text-secondary)" }}>Hack</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          The all-in-one platform for managing hackathons and technical events end-to-end.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,122,0,0.15)", border: "1px solid rgba(255,122,0,0.3)" }}
              >
                <Rocket style={{ color: "var(--accent)" }} />
              </div>
              <CardTitle>I'm a Participant</CardTitle>
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
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,122,0,0.10)", border: "1px solid rgba(255,122,0,0.25)" }}
              >
                <Trophy style={{ color: "var(--accent2)" }} />
              </div>
              <CardTitle>I'm an Organiser</CardTitle>
              <CardDescription>
                Create events, manage participants, assign judges, and publish results.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="flex gap-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login/organiser">Login</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/register/organiser">Register</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="z-10 mt-16 text-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Powered by NexusHack Platform
      </motion.div>
    </div>
  )
}
