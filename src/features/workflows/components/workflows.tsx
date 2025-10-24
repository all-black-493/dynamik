"use client"

import { EntityContainer, EntityHeader, EntityPagination, EntitySearch } from "@/components/entity-components"
import { useCreateWorkflow, useSuspenseWorkflows } from "../hooks/use-workflows"
import { useUpgradeModal } from "@/hooks/use-upgrade-modal"
import { useRouter } from "next/navigation"
import { useWorkflowsParams } from "../hooks/use-workflows-params"
import { useEntitySearch } from "@/hooks/use-entity-search"


export const WorkflowsSearch = () => {

    const [params, setParams] = useWorkflowsParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams
    })
    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search workflows"
        />
    )
}

export const WorkflowsList = () => {
    const workflows = useSuspenseWorkflows()

    return (
        <div className="flex flex-1 items-center justify-center">
            {JSON.stringify(workflows.data, null, 2)}
        </div>
    )
}

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {

    const createWorkflow = useCreateWorkflow()
    const { handleError, modal } = useUpgradeModal()
    const router = useRouter()

    const handleCreate = () => {
        createWorkflow.mutate(undefined, {
            onError: (error) => {
                handleError(error)
            },
            onSuccess: (data) => {
                router.push(`/workflows/${data.id}`)
            }
        })
    }
    return (
        <>
            {modal}
            <EntityHeader
                title="Workflows"
                description="Create and manage your Workflows"
                onNew={handleCreate}
                newButtonLabel="New workflow"
                disabled={disabled}
                isCreating={createWorkflow.isPending}
            />
        </>
    )
}

export const WorkflowsPagination = () => {
    const workflows = useSuspenseWorkflows()
    const [params, setParams] = useWorkflowsParams()

    return (
        <EntityPagination
            disabled={workflows.isFetching}
            totalPages={workflows.data.totalPages}
            page={workflows.data.page}
            onPageChange={(page) => {
                setParams({
                    ...params,
                    page
                })
            }}
        />
    )
}

const WorkflowsContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <EntityContainer
            header={<WorkflowsHeader />}
            search={<WorkflowsSearch />}
            pagination={<WorkflowsPagination />}
        >
            {children}
        </EntityContainer>
    )
}

export default WorkflowsContainer
