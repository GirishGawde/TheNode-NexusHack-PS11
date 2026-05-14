import Countdown from "react-countdown"
import { Clock } from "lucide-react"

export default function CountdownTimer({ startDate, endDate }) {
  if (!startDate || !endDate) return null

  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()

  let targetDate = start
  let statusText = "Starts in"

  if (now > start && now < end) {
    targetDate = end
    statusText = "Ends in"
  } else if (now > end) {
    return (
      <div className="flex items-center gap-2 text-slate-400 font-medium">
        <Clock className="h-5 w-5" />
        <span>Event Concluded</span>
      </div>
    )
  }

  const renderer = ({ days, hours, minutes, seconds }) => {
    return (
      <div className="flex items-center gap-4 text-white">
        <div className="flex items-center gap-2 mr-2 text-slate-300">
          <Clock className="h-5 w-5 text-cyan-400" />
          <span className="font-medium text-sm tracking-wide uppercase">{statusText}</span>
        </div>
        
        <div className="flex gap-2">
          <div className="flex flex-col items-center">
            <div className="bg-white/10 rounded-md w-12 h-10 flex items-center justify-center font-mono text-xl font-bold border border-white/5 shadow-inner">
              {String(days).padStart(2, "0")}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Days</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-white/10 rounded-md w-12 h-10 flex items-center justify-center font-mono text-xl font-bold border border-white/5 shadow-inner">
              {String(hours).padStart(2, "0")}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Hours</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-white/10 rounded-md w-12 h-10 flex items-center justify-center font-mono text-xl font-bold border border-white/5 shadow-inner">
              {String(minutes).padStart(2, "0")}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Mins</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-white/10 rounded-md w-12 h-10 flex items-center justify-center font-mono text-xl font-bold border border-violet-500/30 text-violet-300 shadow-inner">
              {String(seconds).padStart(2, "0")}
            </div>
            <span className="text-[10px] text-violet-400 mt-1 uppercase tracking-wider">Secs</span>
          </div>
        </div>
      </div>
    )
  }

  return <Countdown date={targetDate} renderer={renderer} />
}
