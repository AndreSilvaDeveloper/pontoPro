import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import { getBillingStatus } from "@/lib/billing"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { empresaId: true, cargo: true },
  })

  // Super admin não entra nessa regra
  if (user?.cargo === "SUPER_ADMIN") return <>{children}</>

  if (!user?.empresaId) redirect("/login")

  const empresa = await prisma.empresa.findUnique({
    where: { id: user.empresaId },
    select: { status: true, cobrancaAtiva: true, trialAte: true, pagoAte: true },
  })

  const st = getBillingStatus(empresa || {})
  if (st.bloqueado) redirect("/acesso_bloqueado")

  return <>{children}</>
}
