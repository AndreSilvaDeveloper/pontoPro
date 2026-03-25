import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog | WorkID - Ponto Digital e Gestão de Jornada",
  description:
    "Artigos sobre ponto digital, legislação trabalhista, banco de horas e gestão de equipes. Conteúdo prático para empresas brasileiras.",
  openGraph: {
    title: "Blog | WorkID - Ponto Digital e Gestão de Jornada",
    description:
      "Artigos sobre ponto digital, legislação trabalhista, banco de horas e gestão de equipes.",
    url: "https://ontimeia.com/blog",
    siteName: "WorkID",
    type: "website",
  },
};

export default function BlogPage() {
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-[#0a0e27]/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
          <Link href="/" className="text-xl font-bold text-white">
            Work<span className="text-purple-500">ID</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 pb-8 pt-16 md:px-6 md:pt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent" />
        <div className="container relative mx-auto text-center">
          <span className="mb-4 inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-400">
            Blog
          </span>
          <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            Conteúdo para{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              gestão inteligente
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-gray-400 md:text-lg">
            Artigos sobre ponto digital, legislação trabalhista, banco de horas
            e tudo que você precisa saber para gerenciar sua equipe com
            eficiência.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="px-4 pb-20 md:px-6">
        <div className="container mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-purple-500/20 bg-[#0f1333] transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-purple-950/50 to-pink-950/30">
                  <div className="flex h-full items-center justify-center">
                    <span className="text-4xl font-bold text-purple-500/20 transition-colors group-hover:text-purple-500/30">
                      WorkID
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-purple-400">
                    {post.title}
                  </h2>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <time className="text-xs text-gray-500">
                      {new Date(post.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <span className="text-sm font-medium text-purple-400 transition-colors group-hover:text-purple-300">
                      Ler mais &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
