"use client"

import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView } from "@/components/entity-components"
import { Credential, CredentialType } from "@/generated/prisma"
import { useEntitySearch } from "@/hooks/use-entity-search"
import { formatDistanceToNow } from "date-fns"
import { LockKeyholeIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRemoveCredential, useSuspenseCredentials } from "../hooks/use-credentials"
import { useCredentialsParams } from "../hooks/use-credentials-params"
import Image from "next/image"

export const CredentialsSearch = () => {

    const [params, setParams] = useCredentialsParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams
    })
    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search credentials"
        />
    )
}

export const CredentialsList = () => {
    const credentials = useSuspenseCredentials()

    return (
        <EntityList
            items={credentials.data.items}
            getKey={(credential) => credential.id}
            renderItem={(credential) => <CredentialItem data={credential} />}
            emptyView={<CredentialsEmpty />}
        />
    )
}

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {

    return (

        <EntityHeader
            title="Credentials"
            description="Create and manage your Credentials"
            newButtonLabel="New credential"
            newButtonHref="/credentials/new"
            disabled={disabled}
        />
    )
}

export const CredentialsPagination = () => {
    const credentials = useSuspenseCredentials()
    const [params, setParams] = useCredentialsParams()

    return (
        <EntityPagination
            disabled={credentials.isFetching}
            totalPages={credentials.data.totalPages}
            page={credentials.data.page}
            onPageChange={(page) => {
                setParams({
                    ...params,
                    page
                })
            }}
        />
    )
}

const CredentialsContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <EntityContainer
            header={<CredentialsHeader />}
            search={<CredentialsSearch />}
            pagination={<CredentialsPagination />}
        >
            {children}
        </EntityContainer>
    )
}

export default CredentialsContainer

export const CredentialsLoading = () => {
    return <LoadingView message="Loading credentials ..." />
}

export const CredentialsError = () => {
    return <ErrorView message="Error Loading Credentials ..." />
}

export const CredentialsEmpty = () => {
    const router = useRouter()

    const handleCreate = () => {

        router.push(`/credentials/new`)

    }
    return (
        <>
            <EmptyView
                onNew={handleCreate}
                message="You haven't created any credentials yet. Get started by creating your first credential"
            />
        </>
    )
}

const credentialLogos: Record<CredentialType, string> = {
    [CredentialType.OPENAI]: "/logos/openai.svg",
    [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
    [CredentialType.GEMINI]: "/logos/gemini.svg",
    [CredentialType.DEEPSEEK]: "/logos/deepseek.svg",
    [CredentialType.PERPLEXITY]: "/logos/perplexity.svg",
    [CredentialType.GROK]: "/logos/grok.svg",
    [CredentialType.TIKTOK_CLIENT_KEY]: "/logos/tiktok.svg",
    [CredentialType.TIKTOK_CLIENT_SECRET]: "/logos/tiktok.svg",
    [CredentialType.TIKTOK_ACCESS_TOKEN]: "/logos/tiktok.svg",
    [CredentialType.WHATSAPP_ACCESS_TOKEN]: "/logos/whatsapp.svg"

}
export const CredentialItem = ({
    data
}: { data: Credential }) => {

    const removeCredential = useRemoveCredential()
    const handleRemove = () => {
        removeCredential.mutate({ id: data.id })
    }

    const logo = credentialLogos[data.type]


    return (
        <EntityItem
            href={`/credentials/${data.id}`}
            title={data.name}
            subtitle={
                <>
                    Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
                    &bull; Created {" "}
                    {formatDistanceToNow(data.createdAt, { addSuffix: true })}
                </>
            }
            image={
                <div className="size-8 flex items-center justify-center">
                    <Image src={logo} alt={data.type} width={20} height={20} />
                </div>
            }
            onRemove={handleRemove}
            isRemoving={removeCredential.isPending}
        />
    )
}
