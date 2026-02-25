"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { toast } from "sonner";

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && !loading) {
      navigate('/');
    }
  }, [session, loading, navigate]);

  // Listener para erros de autenticação do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Limpa possíveis estados residuais
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-primary/20 shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl animate-bounce">
                    <BarChart className="h-10 w-10 text-primary" />
                </div>
            </div>
          <CardTitle className="text-3xl font-black tracking-tighter">RICO 2.0</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">Acesse sua conta para operar</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={['google']}
            redirectTo={`${window.location.origin}/`}
            appearance={{ 
                theme: ThemeSupa,
                variables: {
                    default: {
                        colors: {
                            brand: 'hsl(var(--primary))',
                            brandAccent: 'hsl(var(--primary))',
                        }
                    }
                },
                className: {
                    container: 'flex flex-col gap-4',
                    button: 'font-bold py-2',
                    input: 'bg-muted/50 border-none'
                }
            }}
            theme="dark"
            localization={{
                variables: {
                    sign_in: {
                        email_label: 'E-mail',
                        password_label: 'Senha',
                        button_label: 'Entrar',
                        loading_button_label: 'Entrando...',
                        social_provider_text: 'Entrar com {{provider}}',
                        link_text: 'Já tem uma conta? Entre',
                    },
                    sign_up: {
                        email_label: 'E-mail',
                        password_label: 'Crie uma senha',
                        button_label: 'Criar conta',
                        loading_button_label: 'Criando conta...',
                        link_text: 'Não tem uma conta? Cadastre-se',
                    },
                    forgotten_password: {
                        email_label: 'E-mail',
                        password_label: 'Senha',
                        button_label: 'Recuperar senha',
                        loading_button_label: 'Enviando e-mail...',
                        link_text: 'Esqueceu sua senha?',
                    }
                }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;