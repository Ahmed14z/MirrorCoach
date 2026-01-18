'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Guitar,
  Dumbbell,
  ChefHat,
  Activity,
  Flower2,
  Eye,
  Mic,
  Zap,
  MessageCircle,
  Camera,
  Target,
  CheckCircle,
  ArrowRight,
  MonitorPlay,
  Monitor,
} from 'lucide-react';

// Icon mapping with proper sizing
const SKILL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  guitar: ({ className }) => <Guitar className={className} strokeWidth={1.5} />,
  yoga: ({ className }) => <Flower2 className={className} strokeWidth={1.5} />,
  fitness: ({ className }) => <Dumbbell className={className} strokeWidth={1.5} />,
  cooking: ({ className }) => <ChefHat className={className} strokeWidth={1.5} />,
  pushups: ({ className }) => <Activity className={className} strokeWidth={1.5} />,
  screen_assistant: ({ className }) => <Monitor className={className} strokeWidth={1.5} />,
};

const SKILLS = [
  {
    id: 'guitar',
    name: 'Guitar',
    description: 'Master chords, strumming patterns, and proper finger placement with real-time visual feedback',
    accentColor: 'from-amber-400/20 to-orange-500/20',
    borderColor: 'from-amber-400/50 to-orange-500/50',
    iconColor: 'text-amber-400',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    description: 'Perfect your asanas with posture correction and breathing guidance for deeper practice',
    accentColor: 'from-emerald-400/20 to-teal-500/20',
    borderColor: 'from-emerald-400/50 to-teal-500/50',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    description: 'Get precise form analysis on any exercise to maximize results and prevent injury',
    accentColor: 'from-red-400/20 to-pink-500/20',
    borderColor: 'from-red-400/50 to-pink-500/50',
    iconColor: 'text-red-400',
  },
  {
    id: 'cooking',
    name: 'Cooking',
    description: 'Learn professional knife skills and culinary techniques with step-by-step guidance',
    accentColor: 'from-yellow-400/20 to-amber-500/20',
    borderColor: 'from-yellow-400/50 to-amber-500/50',
    iconColor: 'text-yellow-400',
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    description: 'Achieve perfect form and automatic rep counting for effective strength training',
    accentColor: 'from-violet-400/20 to-indigo-500/20',
    borderColor: 'from-violet-400/50 to-indigo-500/50',
    iconColor: 'text-violet-400',
  },
  {
    id: 'screen_assistant',
    name: 'Screen Assistant',
    description: 'Share your screen and get AI guidance with visual annotations for any task',
    accentColor: 'from-blue-400/20 to-cyan-500/20',
    borderColor: 'from-blue-400/50 to-cyan-500/50',
    iconColor: 'text-blue-400',
  },
];

const FEATURES = [
  {
    icon: Eye,
    label: '10 FPS Video',
  },
  {
    icon: Mic,
    label: 'Audio Analysis',
  },
  {
    icon: Zap,
    label: 'Sub-2s Latency',
  },
  {
    icon: MessageCircle,
    label: 'Natural Voice',
  },
];

const STEPS = [
  {
    number: 1,
    title: 'Position Your Camera',
    description: 'Set up your device so the AI coach can see your full body or hands clearly',
    icon: Camera,
  },
  {
    number: 2,
    title: 'Begin Your Practice',
    description: 'The AI observes your movements and listens, analyzing technique in real-time',
    icon: Target,
  },
  {
    number: 3,
    title: 'Receive Live Feedback',
    description: 'Get voice coaching and actionable tips as you practice, like having a personal trainer',
    icon: CheckCircle,
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-blue-950/20 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10">
        {/* Hero Section */}
        <motion.section
          className="container mx-auto px-6 pt-20 pb-16"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 mb-8"
            >
              <MonitorPlay className="w-10 h-10 text-violet-400" strokeWidth={1.5} />
            </motion.div>

            {/* Main headline */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
            >
              <span className="text-white">Mirror</span>
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Coach</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed"
            >
              Your AI skill coach that{' '}
              <span className="text-violet-400 font-medium">sees</span> and{' '}
              <span className="text-blue-400 font-medium">hears</span> you in real-time.
            </motion.p>

            <motion.p
              variants={itemVariants}
              className="text-lg text-slate-500 mb-12"
            >
              Like having an expert mentor available 24/7.
            </motion.p>

            {/* Feature badges */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              {FEATURES.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                  >
                    <IconComponent className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                    <span className="text-slate-300 text-sm font-medium">{feature.label}</span>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.section>

        {/* Skills Section */}
        <motion.section
          className="container mx-auto px-6 py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
              Choose Your Skill
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Select a discipline to begin your personalized coaching session
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {SKILLS.map((skill, index) => {
              const IconComponent = SKILL_ICONS[skill.id];
              return (
                <motion.div
                  key={skill.id}
                  variants={cardVariants}
                  custom={index}
                >
                  <Link href={`/coach/${skill.id}`}>
                    <div className="group relative h-[320px] rounded-2xl overflow-hidden cursor-pointer">
                      {/* Glass card background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl" />

                      {/* Gradient border effect */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${skill.borderColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ padding: '1px' }}>
                        <div className="absolute inset-[1px] rounded-2xl bg-[#0d1321]" />
                      </div>

                      {/* Default border */}
                      <div className="absolute inset-0 rounded-2xl border border-white/[0.08] group-hover:border-transparent transition-colors duration-500" />

                      {/* Glow effect on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${skill.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      {/* Content */}
                      <div className="relative h-full p-8 flex flex-col">
                        {/* Icon */}
                        <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500 ease-out">
                          <div className={`w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${skill.iconColor}`}>
                            <IconComponent className="w-8 h-8" />
                          </div>
                        </div>

                        {/* Text content */}
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-white transition-colors">
                            {skill.name}
                          </h3>
                          <p className="text-slate-400 text-base leading-relaxed group-hover:text-slate-300 transition-colors">
                            {skill.description}
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex items-center gap-2 text-slate-500 group-hover:text-white transition-all duration-300">
                          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                            Start Session
                          </span>
                          <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* How it Works Section */}
        <motion.section
          className="container mx-auto px-6 py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={cardVariants}
                  custom={index}
                  className="relative"
                >
                  {/* Connector line for desktop */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[1px] bg-gradient-to-r from-violet-500/30 to-transparent" />
                  )}

                  <div className="text-center">
                    {/* Icon container */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <StepIcon className="w-10 h-10" strokeWidth={1.5} />
                      </div>
                      {/* Step number badge */}
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{step.number}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MonitorPlay className="w-8 h-8 text-violet-400" strokeWidth={1.5} />
              <span className="text-slate-400 text-sm">MirrorCoach AI</span>
            </div>
            <p className="text-slate-500 text-sm">
              Powered by Google Gemini Live API
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
