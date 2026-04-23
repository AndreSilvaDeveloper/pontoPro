import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import {
  getPostBySlug,
  getAllSlugs,
  getRelatedPosts,
} from "@/data/blog-posts";
import { ShareButtons } from "./share-buttons";
import { BASE_URL } from "@/config/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post não encontrado" };

  return {
    title: `${post.title} | Blog WorkID`,
    description: post.description,
    keywords: post.tags.join(", "),
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      siteName: "WorkID",
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${BASE_URL}${post.ogImage}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "WorkID",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "WorkID",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/images/og-image.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[#0a0e27]">
        {/* Header */}
        <header className="border-b border-purple-500/20 bg-[#0a0e27]/80 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6">
            <Link
              href="/blog"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao blog
            </Link>
            <Link href="/" className="text-xl font-bold text-white">
              Work<span className="text-purple-500">ID</span>
            </Link>
          </div>
        </header>

        {/* Article */}
        <article className="px-4 pb-16 pt-12 md:px-6 md:pt-16">
          <div className="container mx-auto max-w-3xl">
            {/* Meta */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {post.readTime} de leitura
              </span>
              <time className="text-xs text-gray-500">
                {new Date(post.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>

            {/* Title */}
            <h1 className="mb-6 text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Description */}
            <p className="mb-8 text-lg text-gray-400">{post.description}</p>

            {/* Share */}
            <div className="mb-10 flex items-center gap-3 border-b border-purple-500/20 pb-8">
              <span className="text-sm text-gray-500">Compartilhar:</span>
              <ShareButtons title={post.title} slug={post.slug} />
            </div>

            {/* Content */}
            <div
              className="blog-content max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-purple-500/20 pt-8">
              <Tag className="h-4 w-4 text-gray-500" />
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1 text-xs text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* CTA Banner */}
        <section className="px-4 pb-16 md:px-6">
          <div className="container mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/50 to-pink-950/30 p-8 text-center md:p-12">
              <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
                Teste grátis o WorkID
              </h2>
              <p className="mx-auto mb-6 max-w-lg text-gray-400">
                Ponto digital com GPS, reconhecimento facial e banco de horas
                automático. Comece em menos de 2 minutos.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3 font-semibold text-white shadow-lg shadow-purple-500/30 transition-colors hover:bg-purple-700"
              >
                Criar conta grátis
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="px-4 pb-20 md:px-6">
            <div className="container mx-auto max-w-3xl">
              <h2 className="mb-6 text-xl font-bold text-white">
                Artigos relacionados
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group rounded-xl border border-purple-500/20 bg-[#0f1333] p-5 transition-all hover:border-purple-500/40"
                  >
                    <span className="mb-2 block text-xs text-purple-400">
                      {related.category}
                    </span>
                    <h3 className="mb-2 text-sm font-semibold text-white transition-colors group-hover:text-purple-400">
                      {related.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {related.readTime} de leitura
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
