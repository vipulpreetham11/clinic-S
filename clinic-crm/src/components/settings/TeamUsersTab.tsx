import { useState } from 'react'
import { Plus, UserX, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AddUserModal } from '@/components/settings/AddUserModal'
import { useClinicUsers, useSetUserActive, useUpdateUserRole } from '@/hooks/useSettings'
import { SETTINGS_ROLE_LABELS, type SettingsUserRole } from '@/types/settings'
import { useAuthContext } from '@/context/AuthContext'

export function TeamUsersTab() {
  const { profile } = useAuthContext()
  const { data: users = [], isLoading } = useClinicUsers()
  const setActive = useSetUserActive()
  const updateRole = useUpdateUserRole()
  const [inviteOpen, setInviteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Team members</CardTitle>
            <CardDescription>Manage who can access your clinic workspace</CardDescription>
          </div>
          <Button className="gap-2" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === profile?.id
                const role = user.role as SettingsUserRole
                const displayRole =
                  role in SETTINGS_ROLE_LABELS
                    ? SETTINGS_ROLE_LABELS[role as SettingsUserRole]
                    : user.role

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <span className="text-sm">{displayRole}</span>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(v) => {
                            if (!v) return
                            updateRole.mutate({
                              userId: user.id,
                              role: v as SettingsUserRole,
                              doctorId: user.doctor_id,
                            })
                          }}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SETTINGS_ROLE_LABELS) as SettingsUserRole[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {SETTINGS_ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={setActive.isPending}
                          onClick={() =>
                            setActive.mutate({ userId: user.id, isActive: !user.is_active })
                          }
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddUserModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}