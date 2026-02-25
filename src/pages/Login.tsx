"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && !loading) {
      navigate('/');
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <BarChart className="h-10 w-10 text-primary" />
                </div>
            </div>
          <CardTitle className="text-2xl font-black">Rico 2.0</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">Entre na sua conta para acessar o robô</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ 
                theme: ThemeSupa,
                variables: {
                    default: {
                        colors: {
                            brand: 'hsl(var(--primary))',
                            brandAccent: 'hsl(var(--primary))',
                        }
                    }
                }
            }}
            theme="dark"
            providers={[]}
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