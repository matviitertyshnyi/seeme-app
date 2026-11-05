import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Users, Ban, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Leave The Room',
  description:
    'Terms of Service for Leave The Room (https://leavetheroom.tech). Guidelines for real-world sports, community safety, and attendance reliability.',
};

export default function TermsOfServicePage() {
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-ink dark:text-white">
                Terms of Service
              </h1>
              <p className="text-xs font-semibold text-ink-muted dark:text-[#A8A29E]">
                Leave The Room (<span className="text-brand dark:text-brand-accent">https://leavetheroom.tech</span>) • Effective Date: November 2026
              </p>
            </div>
          </div>
          <p className="text-sm text-ink-muted dark:text-[#A8A29E] leading-relaxed pt-2">
            Welcome to Leave The Room. By creating an account or using our platform to organize or join real-world meetups, you agree to these Terms of Service.
          </p>
        </header>

        {/* Main Content Sections */}
        <main className="space-y-8 text-sm leading-relaxed text-ink/90 dark:text-[#E7E2D9]">
          {/* Section 1: Eligibility */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <CheckCircle className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>1. Eligibility &amp; Account Identity</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">Age Requirement:</strong> You must be at least eighteen (18) years of age to register an account, participate in meetups, or use Leave The Room.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Accurate Information:</strong> You agree to provide true, current, and complete profile information (such as your actual age and identity). Impersonation, spoofing OAuth profiles, or creating burner/bot profiles is strictly prohibited.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Authentication:</strong> Each user is permitted one primary account linked to their verified Google or Apple account.
              </li>
            </ul>
          </section>

          {/* Section 2: Real-World Meetup Safety & Assumption of Risk */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2>2. Real-World Meetup Safety &amp; Assumption of Risk</h2>
            </div>
            <p>
              Leave The Room facilitates introductions and lobby coordination for physical, in-person activities (such as tennis, basketball, running, chess, ping pong, and board games). We do not own, manage, or inspect meetup venues, nor do we employ attendees.
            </p>
            <div className="p-4 rounded-xl bg-canvas dark:bg-[#262220] border border-border dark:border-[#3a3533] space-y-2 text-xs">
              <p className="font-bold text-ink dark:text-white uppercase tracking-wider">Public Venue Recommendation &amp; Personal Responsibility:</p>
              <ul className="list-disc pl-4 space-y-1 text-ink-muted dark:text-[#A8A29E]">
                <li>Always meet in public, well-lit venues (public parks, community centers, cafes, or verified sports complexes).</li>
                <li>You voluntarily assume all risks associated with traveling to and participating in physical sports and games, including the risk of athletic injury or physical disputes.</li>
                <li>You are solely responsible for evaluating your physical fitness and taking reasonable precautions for your personal safety.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Show-Up Reliability & Community Conduct */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Users className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>3. Show-Up Reliability &amp; Community Conduct</h2>
            </div>
            <p>
              Leave The Room is built on respect for other people&apos;s time and a shared commitment to showing up in person:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-muted dark:text-[#A8A29E]">
              <li>
                <strong className="text-ink dark:text-white">No Flaking Policy:</strong> When you join or host a meetup lobby, other participants count on your attendance. If you cannot attend, cancel your spot well in advance. Habitual no-shows lower your Reliability Score and may restrict lobby privileges.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Zero Tolerance for Harassment:</strong> Bullying, discrimination, hate speech, stalking, unwelcome physical contact, or disruptive behavior will result in an immediate and permanent ban.
              </li>
              <li>
                <strong className="text-ink dark:text-white">No Fake or Commercial Listings:</strong> Lobbies must represent genuine personal meetups. Creating promotional ads, commercial solicitations, spam, or fictitious meetup locations is strictly forbidden.
              </li>
            </ul>
          </section>

          {/* Section 4: Account Termination & Contact */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Ban className="w-5 h-5 text-rose-500" />
              <h2>4. Account Termination &amp; Moderation</h2>
            </div>
            <p className="text-ink-muted dark:text-[#A8A29E]">
              We reserve the right to suspend or permanently terminate any user account without prior notice if we determine that the user has violated these Terms of Service, posed a safety threat to other members, or engaged in abusive conduct.
            </p>
            <p className="text-ink-muted dark:text-[#A8A29E]">
              You may also terminate your own account at any time by contacting our support team.
            </p>
          </section>

          {/* Section 5: Contact Information */}
          <section className="bg-white dark:bg-[#1C1917] p-6 rounded-2xl border border-border dark:border-[#292524] shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-base font-bold text-ink dark:text-white">
              <Mail className="w-5 h-5 text-brand dark:text-brand-accent" />
              <h2>5. Contact &amp; Questions</h2>
            </div>
            <p className="text-ink-muted dark:text-[#A8A29E]">
              For inquiries regarding these Terms of Service, community safety reports, or legal notices, contact:
            </p>
            <p className="font-semibold text-ink dark:text-white">
              Leave The Room Operations •{' '}
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
            <Link href="/privacy" className="hover:text-ink dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
