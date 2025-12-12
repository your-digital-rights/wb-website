"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Check, HelpCircle } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Link } from "@/i18n/navigation"
import { fadeInUp, staggerChildren, scaleIn } from "../../context/design-system/motion/variants"
import { usePricing } from "@/hooks/usePricing"
import { trackSelectItem } from "@/lib/analytics"

export function PricingTable() {
  const t = useTranslations('pricing')
  const shouldReduce = useReducedMotion()
  const { basePackagePricePerMonth } = usePricing()

  const variants = shouldReduce ? {} : {
    container: staggerChildren,
    title: fadeInUp,
    card: scaleIn
  }

  const plans = [
    {
      id: 'fast',
      name: t('fast.name'),
      tagline: t('fast.tagline'),
      price: basePackagePricePerMonth,
      features: [
        { text: t('fast.feature1') },
        { text: t('fast.feature2') },
        { text: t('fast.feature3'), tooltip: t('fast.feature3Tooltip') },
        { text: t('fast.feature4') },
        { text: t('fast.feature5'), tooltip: t('fast.feature5Tooltip') },
        { text: t('fast.feature6'), tooltip: t('fast.feature6Tooltip') }
      ],
      popular: true,
      href: '/onboarding'
    },
    {
      id: 'custom',
      name: t('custom.name'),
      tagline: t('custom.tagline'),
      price: t('custom.price'),
      features: [
        { text: t('custom.feature1') },
        { text: t('custom.feature2') },
        { text: t('custom.feature3') },
        { text: t('custom.feature4') },
        { text: t('custom.feature5') }
      ],
      popular: false,
      href: '/custom-software'
    }
  ]

  return (
    <TooltipProvider>
      <section id="pricing" className="py-24 bg-muted">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              data-testid="pricing-title"
              className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4"
              variants={variants.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {t('title')}
            </motion.h2>
          </div>

          <motion.div
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            variants={variants.container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {plans.map((plan) => (
              <motion.div key={plan.id} variants={variants.card} className="h-full">
                <Card
                  data-testid={`pricing-card-${plan.id}`}
                  className={`relative h-full flex flex-col ${plan.popular ? 'ring-2 ring-accent shadow-lg' : ''}`}
                >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-black px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-lg">{plan.tagline}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-accent">{plan.price}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 flex-1">{feature.text}</span>
                        {feature.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-1 flex-shrink-0"
                                aria-label="More information"
                              >
                                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{feature.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button
                    data-testid={`pricing-cta-${plan.id}`}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                    onClick={() => trackSelectItem(
                      plan.id === 'fast' ? 'fast_simple' : 'custom_made',
                      'pricing_card'
                    )}
                  >
                    <Link href={plan.href}>
                      Start with {plan.name}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </TooltipProvider>
  )
}