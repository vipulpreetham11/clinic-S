import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthContext } from '@/context/AuthContext'
import { useCreateUser } from '@/hooks/useCreateUser'
import { addTeamUserSchema, type AddTeamUserFormValues } from '@/lib/createUserSchemas'

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TEAM_ROLE_LABELS: Record<'admin' | 'receptionist', string> = {
  admin: 'Clinic Admin',
  receptionist: 'Receptionist',
}

export function AddUserModal({ open, onOpenChange }: AddUserModalProps) {
  const { clinic } = useAuthContext()
  const createUser = useCreateUser()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<AddTeamUserFormValues>({
    resolver: zodResolver(addTeamUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'receptionist',
      phone: '',
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'receptionist',
        phone: '',
      })
    }
    onOpenChange(next)
  }

  function onSubmit(values: AddTeamUserFormValues) {
    if (!clinic?.id) {
      toast.error('Clinic not found')
      return
    }

    createUser.mutate(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        role: values.role,
        clinic_id: clinic.id,
        phone: values.phone,
      },
      {
        onSuccess: () => {
          toast.success('User created successfully')
          handleOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Creates a login account for clinic admin or receptionist staff.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-9"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TEAM_ROLE_LABELS) as Array<keyof typeof TEAM_ROLE_LABELS>).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {TEAM_ROLE_LABELS[r]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create user'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
