'use client';

import { useMemo } from 'react';
import { Goal, GoalCategory } from '@/types';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Coins } from 'lucide-react';
import { categoryMeta } from '@/lib/categoryConfig';

interface FinancialStatsProps {
  goals: Goal[];
}

export function FinancialStats({ goals }: FinancialStatsProps) {
  // Розрахунок місячного доходу по валютах
  const incomeByCurrency = useMemo(() => {
    const income: Record<string, number> = {};

    goals.forEach(goal => {
      if (!goal.currency) return;

      let monthlyAmount = 0;

      if (goal.paymentType === 'hourly' && goal.hourlyRate && goal.hourlyRate > 0) {
        monthlyAmount = goal.hourlyRate * goal.timeAllocated * 4;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate && goal.fixedRate > 0) {
        if (goal.fixedRatePeriod === 'week') {
          monthlyAmount = goal.fixedRate * 4;
        } else if (goal.fixedRatePeriod === 'month') {
          monthlyAmount = goal.fixedRate;
        }
      }

      if (monthlyAmount > 0) {
        if (!income[goal.currency]) {
          income[goal.currency] = 0;
        }
        income[goal.currency] += monthlyAmount;
      }
    });

    return income;
  }, [goals]);

  // Розрахунок річного доходу
  const yearlyIncome = useMemo(() => {
    const yearly: Record<string, number> = {};
    Object.entries(incomeByCurrency).forEach(([currency, monthly]) => {
      yearly[currency] = monthly * 12;
    });
    return yearly;
  }, [incomeByCurrency]);

  // Розрахунок доходу по категоріях
  const incomeByCategory = useMemo(() => {
    const income: Record<GoalCategory, Record<string, number>> = {
      [GoalCategory.WORK_STARTUPS]: {},
      [GoalCategory.LEARNING]: {},
      [GoalCategory.HEALTH_SPORTS]: {},
      [GoalCategory.HOBBIES]: {},
    };

    goals.forEach(goal => {
      if (!goal.currency) return;

      let monthlyAmount = 0;

      if (goal.paymentType === 'hourly' && goal.hourlyRate && goal.hourlyRate > 0) {
        monthlyAmount = goal.hourlyRate * goal.timeAllocated * 4;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate && goal.fixedRate > 0) {
        if (goal.fixedRatePeriod === 'week') {
          monthlyAmount = goal.fixedRate * 4;
        } else if (goal.fixedRatePeriod === 'month') {
          monthlyAmount = goal.fixedRate;
        }
      }

      if (monthlyAmount > 0) {
        if (!income[goal.category][goal.currency]) {
          income[goal.category][goal.currency] = 0;
        }
        income[goal.category][goal.currency] += monthlyAmount;
      }
    });

    return income;
  }, [goals]);

  // Розрахунок вартості години (скільки коштує година часу)
  const hourlyValue = useMemo(() => {
    const totalHours = goals.reduce((sum, g) => sum + g.timeAllocated, 0);
    if (totalHours === 0) return {};

    const hourlyVal: Record<string, number> = {};
    Object.entries(incomeByCurrency).forEach(([currency, monthly]) => {
      // Місячний дохід / (години на тиждень * 4 тижні)
      hourlyVal[currency] = monthly / (totalHours * 4);
    });

    return hourlyVal;
  }, [goals, incomeByCurrency]);

  // Основна валюта (з найбільшим доходом)
  const primaryCurrency = useMemo(() => {
    const entries = Object.entries(incomeByCurrency);
    if (entries.length === 0) return null;

    return entries.reduce((max, curr) => curr[1] > max[1] ? curr : max)[0];
  }, [incomeByCurrency]);

  // ROI - скільки заробляєш на годину часу
  const roi = useMemo(() => {
    const paidGoals = goals.filter(g => g.currency);
    if (paidGoals.length === 0) return {};

    const roiData: Record<string, number> = {};

    paidGoals.forEach(goal => {
      if (!goal.currency || goal.timeAllocated === 0) return;

      let hourlyRate = 0;
      if (goal.paymentType === 'hourly' && goal.hourlyRate) {
        hourlyRate = goal.hourlyRate;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate) {
        const monthlyRate = goal.fixedRatePeriod === 'week' ? goal.fixedRate * 4 : goal.fixedRate;
        hourlyRate = monthlyRate / (goal.timeAllocated * 4);
      }

      if (hourlyRate > 0) {
        if (!roiData[goal.currency]) {
          roiData[goal.currency] = 0;
        }
        roiData[goal.currency] += hourlyRate;
      }
    });

    // Середній ROI
    Object.keys(roiData).forEach(currency => {
      const count = paidGoals.filter(g => g.currency === currency).length;
      roiData[currency] = roiData[currency] / count;
    });

    return roiData;
  }, [goals]);

  // Найприбутковіша ціль
  const mostProfitableGoal = useMemo(() => {
    const paidGoals = goals.filter(g => g.currency);
    if (paidGoals.length === 0) return null;

    return paidGoals.reduce((max, goal) => {
      let monthlyAmount = 0;

      if (goal.paymentType === 'hourly' && goal.hourlyRate) {
        monthlyAmount = goal.hourlyRate * goal.timeAllocated * 4;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate) {
        monthlyAmount = goal.fixedRatePeriod === 'week' ? goal.fixedRate * 4 : goal.fixedRate;
      }

      let maxAmount = 0;
      if (max.paymentType === 'hourly' && max.hourlyRate) {
        maxAmount = max.hourlyRate * max.timeAllocated * 4;
      } else if (max.paymentType === 'fixed' && max.fixedRate) {
        maxAmount = max.fixedRatePeriod === 'week' ? max.fixedRate * 4 : max.fixedRate;
      }

      return monthlyAmount > maxAmount ? goal : max;
    });
  }, [goals]);

  // Потенційний дохід (якщо використати весь вільний час)
  const potentialIncome = useMemo(() => {
    if (!primaryCurrency || !hourlyValue[primaryCurrency]) return null;

    const totalHours = goals.reduce((sum, g) => sum + g.timeAllocated, 0);
    const availableHours = 60; // Припускаємо 60 годин доступно на тиждень
    const freeHours = Math.max(0, availableHours - totalHours);

    if (freeHours === 0) return null;

    return {
      freeHours,
      monthlyPotential: hourlyValue[primaryCurrency] * freeHours * 4,
      yearlyPotential: hourlyValue[primaryCurrency] * freeHours * 4 * 12,
    };
  }, [goals, primaryCurrency, hourlyValue]);

  if (Object.keys(incomeByCurrency).length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Немає фінансової інформації. Додайте оплату до ваших цілей.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Основні фінансові показники */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Місячний дохід */}
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Місячний дохід</h3>
          </div>
          {Object.entries(incomeByCurrency).map(([currency, amount]) => (
            <div key={currency} className="mb-2">
              <p className="text-3xl font-bold">
                {amount.toFixed(0)} {currency}
              </p>
            </div>
          ))}
        </Card>

        {/* Річний дохід */}
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Річний дохід</h3>
          </div>
          {Object.entries(yearlyIncome).map(([currency, amount]) => (
            <div key={currency} className="mb-2">
              <p className="text-3xl font-bold">
                {amount.toFixed(0)} {currency}
              </p>
            </div>
          ))}
        </Card>

        {/* Вартість години */}
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Вартість години</h3>
          </div>
          {Object.entries(hourlyValue).map(([currency, value]) => (
            <div key={currency} className="mb-2">
              <p className="text-3xl font-bold">
                {value.toFixed(0)} {currency}
              </p>
              <p className="text-sm text-muted-foreground">за годину</p>
            </div>
          ))}
        </Card>

        {/* Середній ROI */}
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Середній ROI</h3>
          </div>
          {Object.entries(roi).map(([currency, value]) => (
            <div key={currency} className="mb-2">
              <p className="text-3xl font-bold">
                {value.toFixed(0)} {currency}
              </p>
              <p className="text-sm text-muted-foreground">за годину роботи</p>
            </div>
          ))}
        </Card>
      </div>

      {/* Дохід по категоріях */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Дохід по категоріях</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryMeta.map(cat => {
            const catIncome = incomeByCategory[cat.id];
            const hasCatIncome = Object.keys(catIncome).length > 0;

            if (!hasCatIncome) return null;

            return (
              <Card key={cat.id} className="p-6 bg-white dark:bg-card">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </h3>

                <div className="space-y-3">
                  {/* Місячний дохід */}
                  <div>
                    <p className="text-sm text-muted-foreground">Місячний дохід:</p>
                    {Object.entries(catIncome).map(([currency, amount]) => (
                      <p key={currency} className="text-2xl font-bold">
                        {amount.toFixed(0)} {currency}
                      </p>
                    ))}
                  </div>

                  {/* Річний дохід */}
                  <div>
                    <p className="text-sm text-muted-foreground">Річний дохід:</p>
                    {Object.entries(catIncome).map(([currency, amount]) => (
                      <p key={currency} className="text-xl font-semibold text-muted-foreground">
                        {(amount * 12).toFixed(0)} {currency}
                      </p>
                    ))}
                  </div>

                  {/* Відсоток від загального доходу */}
                  {primaryCurrency && catIncome[primaryCurrency] && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Частка від загального доходу:
                      </p>
                      <p className="text-lg font-semibold" style={{ color: '#6ee7b7' }}>
                        {((catIncome[primaryCurrency] / incomeByCurrency[primaryCurrency]) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Аналіз та можливості */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Аналіз та можливості</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Найприбутковіша ціль */}
          {mostProfitableGoal && (
            <Card className="p-6 bg-white dark:bg-card">
              <h3 className="text-sm text-muted-foreground mb-2">Найприбутковіша ціль</h3>
              <p className="text-xl font-bold mb-1">{mostProfitableGoal.name}</p>
              <p className="text-sm text-muted-foreground">
                {mostProfitableGoal.paymentType === 'hourly' && mostProfitableGoal.hourlyRate && (
                  <span>{mostProfitableGoal.hourlyRate} {mostProfitableGoal.currency}/год</span>
                )}
                {mostProfitableGoal.paymentType === 'fixed' && mostProfitableGoal.fixedRate && (
                  <span>
                    {mostProfitableGoal.fixedRate} {mostProfitableGoal.currency}/
                    {mostProfitableGoal.fixedRatePeriod === 'week' ? 'тиж' : 'міс'}
                  </span>
                )}
              </p>
            </Card>
          )}

          {/* Потенційний дохід */}
          {potentialIncome && primaryCurrency && (
            <Card className="p-6 bg-white dark:bg-card">
              <h3 className="text-sm text-muted-foreground mb-2">Потенційний дохід</h3>
              <p className="text-2xl font-bold">
                +{potentialIncome.monthlyPotential.toFixed(0)} {primaryCurrency}
              </p>
              <p className="text-sm text-muted-foreground">
                якщо використати {potentialIncome.freeHours} вільних годин
              </p>
            </Card>
          )}

          {/* Прогноз за рік */}
          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Прогноз за рік</h3>
            {Object.entries(yearlyIncome).map(([currency, yearly]) => (
              <div key={currency}>
                <p className="text-2xl font-bold">
                  {yearly.toFixed(0)} {currency}
                </p>
                {potentialIncome && primaryCurrency === currency && (
                  <p className="text-sm" style={{ color: '#6ee7b7' }}>
                    потенційно +{potentialIncome.yearlyPotential.toFixed(0)} {currency}
                  </p>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
