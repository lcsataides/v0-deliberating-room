"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface SessionClosingProps {
  roomTitle: string
  totalRounds: number
  onBack: () => void
}

export default function SessionClosing({ roomTitle, totalRounds, onBack }: SessionClosingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-primary mb-6"
      >
        <Trophy size={80} />
      </motion.div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sessão Finalizada! 🎉</CardTitle>
          <CardDescription>
            Todas as histórias da sala <span className="font-bold">{roomTitle}</span> foram deliberadas com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            Foram completadas <span className="font-bold text-primary">{totalRounds} rodadas</span> de deliberação.
          </p>
          <p className="text-muted-foreground">
            Obrigado por usar o Deliberating Room para suas estimativas de equipe!
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={onBack} variant="outline" className="w-full gap-2">
            <ArrowLeft size={16} />
            Voltar para a Sala
          </Button>
          <Link href="/" className="w-full">
            <Button className="w-full">Ir para a Página Inicial</Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
