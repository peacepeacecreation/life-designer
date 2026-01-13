'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {  Plus, Trash2, CheckCircle, AlertCircle, FolderKanban, Target } from 'lucide-react';
import { useGoals } from '@/contexts/GoalsContext';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';

interface ClockifyProject {
  id: string;
  clockifyProjectId: string;
  name: string;
  clientName?: string;
  color?: string;
  isArchived: boolean;
}

interface Goal {
  id: string;
  name: string;
  category: string;
  iconUrl?: string;
  color?: string;
}

interface ProjectMapping {
  id: string;
  isActive: boolean;
  autoCategorize: boolean;
  project: ClockifyProject;
  goal: Goal;
}

interface ClockifyProjectMappingTableProps {
  connectionId: string;
}

export default function ClockifyProjectMappingTable({ connectionId }: ClockifyProjectMappingTableProps) {
  const { goals } = useGoals();
  const confirm = useConfirm();

  // State
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [projects, setProjects] = useState<ClockifyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add mapping form
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');

  // Load mappings and projects
  useEffect(() => {
    fetchMappings();
    fetchProjects();
  }, [connectionId]);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/integrations/clockify/mappings');

      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      } else {
        console.error('Failed to fetch mappings');
      }
    } catch (err) {
      console.error('Error fetching mappings:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/clockify/projects?connectionId=${connectionId}`);

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedProject || !selectedGoal) {
      setError('Будь ласка, виберіть проєкт та ціль');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/integrations/clockify/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockifyProjectId: selectedProject,
          goalId: selectedGoal,
          autoCategorize: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка створення зв\'язку');
      }

      setSuccess('Зв\'язок створено успішно');
      setShowAddForm(false);
      setSelectedProject('');
      setSelectedGoal('');

      // Refresh mappings
      await fetchMappings();
    } catch (err: any) {
      setError(err.message || 'Помилка створення зв\'язку');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    const confirmed = await confirm({
      title: 'Видалити зв\'язок?',
      description: 'Ви впевнені, що хочете видалити цей зв\'язок?',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/integrations/clockify/mappings?id=${mappingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка видалення');
      }

      setSuccess('Зв\'язок видалено успішно');

      // Refresh mappings
      await fetchMappings();
    } catch (err: any) {
      setError(err.message || 'Помилка видалення');
    }
  };

  // Get unmapped projects
  const unmappedProjects = projects.filter(
    (project) => !project.isArchived && !mappings.some((m) => m.project?.id === project.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6" />
            <div>
              <CardTitle>Зв'язки проєктів з цілями</CardTitle>
              <CardDescription>
                Налаштуйте автоматичне призначення time entries до цілей на основі Clockify проєктів
              </CardDescription>
            </div>
          </div>
          {unmappedProjects.length > 0 && (
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Додати зв'язок
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Add Mapping Form */}
        {showAddForm && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clockify проєкт</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Виберіть проєкт" />
                    </SelectTrigger>
                    <SelectContent>
                      {unmappedProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            {project.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                            )}
                            <span>{project.name}</span>
                            {project.clientName && (
                              <span className="text-xs text-muted-foreground">
                                ({project.clientName})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ціль (Goal)</Label>
                  <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Виберіть ціль" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <div className="flex items-center gap-2">
                            {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                              (() => {
                                const iconOption = getIconById(goal.iconUrl!);
                                if (iconOption) {
                                  const IconComponent = iconOption.Icon;
                                  return <IconComponent className="w-4 h-4" style={{ color: goal.color }} />;
                                }
                                return null;
                              })()
                            ) : goal.iconUrl ? (
                              <img src={goal.iconUrl} alt="" className="w-4 h-4 object-contain" />
                            ) : null}
                            <span>{goal.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {goal.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedProject('');
                    setSelectedGoal('');
                  }}
                >
                  Скасувати
                </Button>
                <Button
                  onClick={handleCreateMapping}
                  disabled={!selectedProject || !selectedGoal || creating}
                  className="flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader size="sm" />
                      Створення...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Створити зв'язок
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mappings Table */}
        {mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Немає зв'язків проєктів з цілями</p>
            <p className="text-sm mt-1">
              Створіть зв'язок, щоб автоматично призначати time entries до цілей
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clockify Проєкт</TableHead>
                <TableHead>Ціль (Goal)</TableHead>
                <TableHead>Автокатегоризація</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {mapping.project?.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: mapping.project.color }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{mapping.project?.name || 'N/A'}</p>
                        {mapping.project?.clientName && (
                          <p className="text-xs text-muted-foreground">
                            {mapping.project.clientName}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {mapping.goal?.iconUrl && isPredefinedIcon(mapping.goal.iconUrl) ? (
                        (() => {
                          const iconOption = getIconById(mapping.goal.iconUrl!);
                          if (iconOption) {
                            const IconComponent = iconOption.Icon;
                            return <IconComponent className="w-5 h-5" style={{ color: mapping.goal.color }} />;
                          }
                          return null;
                        })()
                      ) : mapping.goal?.iconUrl ? (
                        <img src={mapping.goal.iconUrl} alt="" className="w-5 h-5 object-contain" />
                      ) : null}
                      <div>
                        <p className="font-medium">{mapping.goal?.name || 'N/A'}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {mapping.goal?.category}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={mapping.autoCategorize} disabled />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {unmappedProjects.length > 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground text-center pt-4">
            {unmappedProjects.length} проєктів без зв'язку з цілями
          </p>
        )}
      </CardContent>
    </Card>
  );
}
