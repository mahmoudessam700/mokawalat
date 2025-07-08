
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { Award, ChevronRight, UserMinus, UserPlus, Users, TrendingUp, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

export default function HrDashboardPage() {
  const { t } = useLanguage();

  const hrSections = [
    {
      title: t('human_capital_management.recruitment'),
      description: t('human_capital_management.recruitment_desc'),
      icon: <UserPlus className="size-8" />,
      href: '/hr/jobs',
      disabled: false,
    },
    {
      title: t('human_capital_management.employee_management'),
      description: t('human_capital_management.employee_management_desc'),
      icon: <Users className="size-8" />,
      href: '/employees',
      disabled: false,
    },
    {
      title: t('human_capital_management.attendance.title'),
      description: t('human_capital_management.attendance.desc'),
      icon: <Clock className="size-8" />,
      href: '/hr/attendance',
      disabled: false,
    },
    {
      title: t('human_capital_management.leave_management.title'),
      description: t('human_capital_management.leave_management.desc'),
      icon: <Calendar className="size-8" />,
      href: '/hr/leave',
      disabled: false,
    },
    {
      title: t('human_capital_management.performance'),
      description: t('human_capital_management.performance_desc'),
      icon: <TrendingUp className="size-8" />,
      href: '/hr/performance',
      disabled: false,
    },
    {
      title: t('human_capital_management.training'),
      description: t('human_capital_management.training_desc'),
      icon: <Award className="size-8" />,
      href: '/hr/training',
      disabled: false,
    },
    {
      title: t('human_capital_management.offboarding'),
      description: t('human_capital_management.offboarding_desc'),
      icon: <UserMinus className="size-8" />,
      href: '/hr/offboarding',
      disabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          {t('human_capital_management.page_title')}
        </h1>
        <p className="text-muted-foreground">
          {t('human_capital_management.page_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hrSections.map((section) => (
          <Link
            key={section.title}
            href={section.disabled ? '#' : section.href}
            className={section.disabled ? 'pointer-events-none' : ''}
          >
            <Card className={`h-full transition-all hover:shadow-md hover:border-primary/50 ${section.disabled ? 'opacity-50' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {section.icon}
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
                {!section.disabled && <ChevronRight className="size-5 text-muted-foreground" />}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
