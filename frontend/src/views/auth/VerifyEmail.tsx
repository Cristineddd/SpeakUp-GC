import React from "react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "../../compat/router";
import { useToast } from "../../hooks/use-toast";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function VerifyEmail() {
  const { user, sendEmailVerification, reloadCurrentUser, isLoading } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.emailVerified) {
      // Email is verified, redirect to dashboard
      toast({
        title: "Email Verified!",
        description: "Your email has been verified successfully.",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [user?.emailVerified, navigate, toast]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    if (!user) {
      toast({
        title: "Error",
        description: "No user found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      await sendEmailVerification();
      setResendCooldown(60);
      toast({
        title: "Email sent!",
        description: "Verification email has been sent to your inbox.",
      });
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    if (!user) {
      toast({
        title: "Error", 
        description: "No user found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setChecking(true);
      const updatedUser = await reloadCurrentUser();
      
      // Check the fresh user data from the reload
      if (updatedUser?.emailVerified) {
        toast({
          title: "Email verified!",
          description: "Your email has been successfully verified.",
        });
        // The useEffect will handle navigation
      } else {
        toast({
          title: "Not verified yet",
          description: "Please check your email and click the verification link.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error checking verification status:', error);
      toast({
        title: "Error",
        description: "Failed to check verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full border rounded-xl p-8 bg-card">
        <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
        <p className="text-muted-foreground mb-6">
          We sent a verification link to <span className="font-medium">{user?.email}</span>. Open your inbox and click the link to verify. After that, come back and press "I've verified".
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleResend} disabled={sending || resendCooldown > 0} variant="outline">
            {sending ? "Sending..." : resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : "Resend email"}
          </Button>
          <Button onClick={handleCheck} disabled={checking}>
            {checking ? "Checking..." : "I've verified"}
          </Button>
        </div>
      </div>
    </div>
  );
}
