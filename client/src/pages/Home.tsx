import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ShoppingCart, Upload, BarChart3 } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span>{APP_TITLE || "Software Marketplace"}</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/marketplace" className="text-sm hover:underline">
                  Marketplace
                </Link>
                {user?.role === "seller" && (
                  <Link href="/seller/dashboard" className="text-sm hover:underline">
                    Dashboard
                  </Link>
                )}
                <Link href="/account" className="text-sm hover:underline">
                  Minha Conta
                </Link>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Entrar</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20">
        <div className="container px-4">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-4">
              Marketplace de Software
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Compre, alugue e venda software com segurança. Integração com Stripe para pagamentos seguros e presigned URLs para downloads privados.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/marketplace">Explorar Marketplace</Link>
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" asChild>
                  <a href={getLoginUrl()}>Começar a Vender</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Recursos Principais</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <ShoppingCart className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Compre e Alugue</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Acesso imediato a software com opções de compra permanente ou aluguel por período.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Upload className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Upload Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Envie seus arquivos diretamente para S3 com presigned URLs. Seus arquivos ficam privados e seguros.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Dashboard de Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Acompanhe suas vendas, gere relatórios e receba pagamentos via Stripe Connect.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-100 dark:bg-slate-900">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Junte-se a centenas de desenvolvedores vendendo software.
          </p>
          {!isAuthenticated ? (
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Criar Conta Grátis</a>
            </Button>
          ) : user?.role !== "seller" ? (
            <Button size="lg" disabled>
              Upgrade para Seller
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/seller/products/new">Criar Primeiro Produto</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Software Marketplace. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

