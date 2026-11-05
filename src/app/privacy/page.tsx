import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, Cookie, Mail, MapPin, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Leave The Room',
  description:
    'Privacy Policy for Leave The Room (https://leavetheroom.tech). Learn how we handle account data, location coordinates, and user privacy.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-canvas dark:bg-[#141210] text-ink dark:text-[#FAF8F5] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-dark dark:text-brand-accent dark:hover:text-brand transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>← Back to Leave The Room</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="border-b border-border dark:border-[#292524] pb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand/10 text-brand dark:text-brand-accent">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-ink dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-xs font-semibold text-ink-muted dark:text-[#A8A29E]">
                Leave The Room (<span className="text-brand dark:text-brand-accent">https://leavetheroom.tech</span>) • Effective Date: November 2026
              </p>
            </div>
          </div>
          <p className="text-sm text-ink-muted dark:text-[#A8A29E] leading-relaxed pt-2">
            Leave The Room is designed to get people off their screens and into real-world sports, chess, games, and outdoor activities. We prioritize user privacy, data minimization, and real-life safety.
          </p>
        </header>

        {/* Main Content Sections */}
        <main className="space-y-8 text-sm leading-relaxed text-ink/90 dark:text-[#E7E2D9]">
          {/* Section 1: Information We Collect */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <UserCheck className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>1. Information We Collect</h2>
            </div>
            <p>
              We collect only the essential information necessary to facilitate real-world in-person meetups safely:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">Account Profile Information:</strong> When signing in via Google Sign-In or Apple ID, we receive your verified email address, full name, and profile picture avatar. We do not store or process passwords.
              </li>
              <li>
                <strong className="text-ink dark:text-white">User-Provided Profile Details:</strong> Your age, city, bio/tagline, preferred activities (such as Chess, Ping Pong, Tennis, Running, Board Games), and sport skill level.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Meetup &amp; Check-In Coordinates:</strong> When you search for nearby meetups or check in to an event, your device location coordinates are used exclusively to calculate local distance radii and verify physical arrival at the venue. We do not track your location continuously in the background or maintain persistent real-time GPS trails.
              </li>
            </ul>
          </section>

          {/* Section 2: How We Use Information */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Eye className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>2. How We Use Information</h2>
            </div>
            <p>We utilize the collected information strictly for:</p>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">Facilitating Real-World Local Meetups:</strong> Connecting nearby participants for spontaneous physical activities based on proximity, mutual interests, and availability.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Verifying Attendance Reliability:</strong> Calculating your Reliability Score based on confirmed attendance, helping community members organize games with reliable partners.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Preventing Fake Accounts &amp; Abuse:</strong> Ensuring all participants authenticate via trusted providers (Google or Apple) to keep our physical community safe, trustworthy, and free from bots.
              </li>
            </ul>
          </section>

          {/* Section 3: Data Sharing & Visibility */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Database className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>3. Data Sharing &amp; Visibility</h2>
            </div>
            <p>
              Your privacy is fundamental to our mission:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">Public Profile Visibility:</strong> Meetup participants in the same lobby or nearby area can see your first name, profile picture, age, reliability score, and favorite activities.
              </li>
              <li>
                <strong className="text-ink dark:text-white">No Sale of Personal Data:</strong> We never sell, rent, monetize, or trade your personal information or contact details with third-party advertisers or data brokers.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Service Providers:</strong> We use reliable cloud hosting and OAuth infrastructure solely to deliver the service in compliance with strict privacy standards.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Retention & Account Deletion */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Lock className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>4. Data Retention &amp; Account Deletion</h2>
            </div>
            <p>
              You maintain complete ownership of your personal data. We retain profile and meetup history only as long as your account remains active.
            </p>
            <div className="p-4 rounded-xl bg-canvas dark:bg-[#262220] border border-border dark:border-[#3a3533] space-y-2">
              <p className="font-semibold text-ink dark:text-white">Request Full Deletion:</p>
              <p className="text-ink-muted dark:text-[#A8A29E]">
                Users can request full account and data deletion at any time by emailing us at{' '}
                <a
                  href="mailto:contact@leavetheroom.tech"
                  className="text-brand dark:text-brand-accent font-bold hover:underline"
                >
                  contact@leavetheroom.tech
                </a>
                . All associated personal records, lobbies, and attendance logs will be permanently purged within 30 days of request receipt.
              </p>
            </div>
          </section>

          {/* Section 5: Security & Cookies */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Cookie className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>5. Security &amp; Cookies</h2>
            </div>
            <p>
              We implement industry-standard security safeguards to protect your personal information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">Session Authentication Cookie:</strong> We use an HTTP-only, secure, SameSite authentication cookie (<code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-brand dark:text-brand-accent font-mono text-xs">ltr_session</code> / <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-brand dark:text-brand-accent font-mono text-xs">leavetheroom_session</code>) to keep you signed in securely without exposing credentials to client-side scripts.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Transport Encryption:</strong> All network traffic to and from Leave The Room is encrypted using HTTPS and TLS 1.3.
              </li>
            </ul>
          </section>

          {/* Section 6: Contact Information */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Mail className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>6. Contact Us</h2>
            </div>
            <p className="text-ink-muted dark:text-[#A8A29E]">
              If you have any questions or concerns regarding this Privacy Policy or your personal data, reach out directly to our team:
            </p>
            <p className="font-semibold text-ink dark:text-white">
              Leave The Room Data Privacy Team •{' '}
              <a
                href="mailto:contact@leavetheroom.tech"
                className="text-brand dark:text-brand-accent hover:underline"
              >
                contact@leavetheroom.tech
              </a>
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-6 border-t border-border dark:border-[#292524] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted dark:text-[#A8A29E]">
          <p>© {new Date().getFullYear()} Leave The Room (leavetheroom.tech). All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/" className="hover:text-ink dark:hover:text-white transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-ink dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
