"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { fadeInUp, slideFade, staggerChildren } from "../../context/design-system/motion/variants"
import { trackSelectItem } from "@/lib/analytics"

export function Hero() {
  const t = useTranslations('hero')
  const shouldReduce = useReducedMotion()

  const variants = shouldReduce ? {} : {
    container: staggerChildren,
    title: fadeInUp,
    cta: slideFade('left')
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.png"
          alt="AI-driven digital transformation"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <motion.div 
        className="relative z-10 max-w-content mx-auto px-4 sm:px-6 lg:px-8 text-center"
        variants={variants.container}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          data-testid="hero-title"
          className="font-heading font-bold text-white mb-6 max-w-4xl mx-auto leading-tight"
          style={{ fontSize: '2.70rem' }}
          variants={variants.title}
        >
          {t('title')}
        </motion.h1>
        
        <motion.p
          data-testid="hero-subtitle"
          className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto"
          variants={variants.title}
        >
          {t('subtitle')}
        </motion.p>

        <motion.div variants={variants.cta}>
          <Button
            size="lg"
            className="text-lg px-8 py-3"
            asChild
            data-testid="hero-cta"
            onClick={() => trackSelectItem('fast_simple', 'hero')}
          >
            <Link href="/onboarding">
              {t('cta')}
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-3 bg-white/50 rounded-full mt-2"
          />
        </motion.div>
      </div>
    </section>
  )
}