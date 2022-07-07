import {
  AppLayout,
  Box,
  BreadcrumbGroup,
  BreadcrumbGroupProps,
  SpaceBetween,
  Form,
  Header,
  ExpandableSection,
  Input,
  FormField,
  Button,
  Container,
  Link,
  Textarea,
  Select
} from '@awsui/components-react';
import type { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { createEnvironment } from '../../api/environments';
import { useEnvTypeConfigs } from '../../api/environmentTypeConfigs';
import { useEnvironmentType } from '../../api/environmentTypes';
import { useProjects } from '../../api/projects';
import { layoutLabels } from '../../common/labels';
import { nameRegex, cidrRegex } from '../../common/utils';
import EnvTypeCards from '../../components/EnvTypeCards';
import EnvTypeConfigCards from '../../components/EnvTypeConfigCards';
import Navigation from '../../components/Navigation';
import { CreateEnvironmentForm, CreateEnvironmentFormValidation } from '../../models/Environment';
import { EnvTypeItem } from '../../models/EnvironmentType';
import { EnvTypeConfigItem } from '../../models/EnvironmentTypeConfig';

export interface EnvironmentProps {
  locale: string;
}

export const getServerSideProps = async ({ locale }: EnvironmentProps): Promise<unknown> => ({
  props: {
    ...(await serverSideTranslations(locale, ['common']))
  }
});

const Environment: NextPage = () => {
  // App settings constant

  const router = useRouter();
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [disableSubmit, setDisableSubmit] = useState(true);
  const [selectedEnvType, setselectedEnvType] = useState<EnvTypeItem>();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateEnvironmentForm>({});
  const [formErrors, setFormErrors] = useState<CreateEnvironmentFormValidation>({});
  const { envTypes, areEnvTypesLoading } = useEnvironmentType();
  const { envTypeConfigs, envTypeConfigsLoading } = useEnvTypeConfigs(formData?.envTypeId || '');
  const { projects, areProjectsLoading } = useProjects();
  const OnSelectEnvType = async (selection: EnvTypeItem[]): Promise<void> => {
    const selected = (selection && selection.at(0)) || undefined;
    setselectedEnvType(selected);
    setFormData({
      ...formData,
      envTypeId: selected?.id,
      envTypeConfigId: undefined,
      envType: selected?.type,
      datasetIds: []
    });
  };
  const OnSelectEnvTypeConfig = (selection: EnvTypeConfigItem[]): void => {
    const selected = (selection && selection.at(0)) || undefined;
    setFormData({ ...formData, envTypeConfigId: selected?.id });
  };

  const breadcrumbs: BreadcrumbGroupProps.Item[] = [
    {
      text: 'Service Workbench',
      href: '/'
    },
    {
      text: 'Workspaces',
      href: '/environments'
    },
    {
      text: 'Create Workspace',
      href: '/environments/new'
    }
  ];
  const validationRules = [
    {
      field: 'name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a,
      message: 'Workspace Name is Required'
    },
    {
      field: 'name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a && nameRegex.test(a),
      message:
        'Workspace Name must start with an alphabetic character and can only contain alphanumeric characters (case sensitive) and hyphens.'
    },
    {
      field: 'name',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a && a.length <= 128,
      message: 'Workspace Name cannot be longer than 128 characters'
    },
    {
      field: 'restrictedCIDR',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a,
      message: 'restrictedCIDR is Required'
    },
    {
      field: 'restrictedCIDR',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a && cidrRegex.test(a),
      message: 'Restricted CIDR must be in the format range:  [1.0.0.0/0 - 255.255.255.255/32].'
    },
    {
      field: 'restrictedCIDR',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a && a.length <= 128,
      message: 'Restricted CIDR cannot be longer than 128 characters'
    },
    {
      field: 'projectId',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a,
      message: 'Project ID is Required'
    },
    {
      field: 'envTypeId',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a,
      message: 'Compute Platform is Required'
    },
    {
      field: 'envTypeConfigId',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !!a,
      message: 'Configuration is Required'
    },
    {
      field: 'description',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition: (a: any) => !a || a.length <= 500,
      message: 'Description cannot be longer than 500 characters'
    }
  ];
  const validateField = (field: keyof CreateEnvironmentForm): boolean => {
    for (const rule of validationRules.filter((f) => f.field === field)) {
      // eslint-disable-next-line security/detect-object-injection
      if (!rule.condition(formData[field])) {
        setFormErrors((prevState: CreateEnvironmentFormValidation) => ({
          ...prevState,
          [`${field}Error`]: rule.message
        }));
        return false;
      }
    }
    setFormErrors((prevState: CreateEnvironmentFormValidation) => ({ ...prevState, [`${field}Error`]: '' }));
    return true;
  };
  const submitForm = async (): Promise<void> => {
    setIsSubmitLoading(true);
    try {
      await createEnvironment(formData);
      await router.push({
        pathname: '/environments',
        query: {
          message: 'Workspace Created Successfully',
          notificationType: 'success'
        }
      });
    } catch {
      setError('There was a problem creating a workspace.');
    } finally {
      setIsSubmitLoading(false);
    }
  };
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    setDisableSubmit(
      !validationRules.every((rule) => rule.condition(formData[rule.field as keyof CreateEnvironmentForm]))
    );
    if (formData && Object.keys(formData).length !== 0) {
      //show validations only when there is an interaction with user
      validateField('envTypeConfigId');
      validateField('envTypeId');
      validateField('name');
      validateField('description');
      validateField('projectId');
      validateField('restrictedCIDR');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);
  return (
    <AppLayout
      id="environment"
      headerSelector="#header"
      stickyNotifications
      maxContentWidth={Number.MAX_VALUE}
      toolsHide
      ariaLabels={layoutLabels}
      navigationOpen={navigationOpen}
      navigation={<Navigation activeHref="#/" />}
      onNavigationChange={({ detail }) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        setNavigationOpen(detail.open);
      }}
      breadcrumbs={
        <BreadcrumbGroup items={breadcrumbs} expandAriaLabel="Show path" ariaLabel="Breadcrumbs" />
      }
      content={
        <Container id="environmentContainer">
          <Box>
            <form onSubmit={(e) => e.preventDefault()}>
              <Form
                id="createEnvironment"
                errorText={error}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button formAction="none" variant="link" href="/environments">
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={disableSubmit || isSubmitLoading}
                      loading={isSubmitLoading}
                      onClick={async () => await submitForm()}
                    >
                      Create Workspace
                    </Button>
                  </SpaceBetween>
                }
                header={
                  <Header variant="h1" description="Short Description of create workspaces">
                    Create Research Workspace
                  </Header>
                }
              >
                <SpaceBetween direction="vertical" size="l">
                  <ExpandableSection
                    variant="container"
                    header={
                      <Header variant="h2">
                        Select Compute Platform ({envTypes.length})
                        <Box>Selected: {selectedEnvType?.name || 'None'} </Box>
                      </Header>
                    }
                    defaultExpanded
                  >
                    <FormField errorText={formErrors?.envTypeIdError}>
                      <EnvTypeCards
                        isLoading={areEnvTypesLoading}
                        allItems={envTypes}
                        OnSelect={async (selected) => await OnSelectEnvType(selected.selectedItems)}
                      />
                    </FormField>
                  </ExpandableSection>
                  <ExpandableSection
                    defaultExpanded
                    variant="container"
                    header={<Header variant="h2">Select Configurations</Header>}
                  >
                    <SpaceBetween direction="vertical" size="l">
                      <FormField
                        label="Workspace Name"
                        constraintText={
                          <>
                            <li>
                              Name can only contain alphanumeric characters (case sensitive) and hyphens.
                            </li>
                            <li>It must start with an alphabetic character.</li>
                            <li>Cannot be longer than 128 characters.</li>
                          </>
                        }
                        errorText={formErrors?.nameError}
                      >
                        <Input
                          value={formData?.name || ''}
                          onChange={({ detail: { value } }) => setFormData({ ...formData, name: value })}
                        />
                      </FormField>
                      <FormField
                        label="Restricted CIDR"
                        description="This research workspace will only be reachable from this CIDR. You can get your CIDR range from your IT Department. The provided default is the CIDR that restricts your IP address."
                        constraintText="Note: an environment config with a hardcoded CIDR will override this value."
                        errorText={formErrors?.restrictedCIDRError}
                      >
                        <Input
                          value={formData?.restrictedCIDR || ''}
                          onChange={({ detail: { value } }) =>
                            setFormData({ ...formData, restrictedCIDR: value })
                          }
                        />
                      </FormField>
                      <FormField label="Project ID" errorText={formErrors?.projectIdError}>
                        <Select
                          selectedOption={
                            areProjectsLoading
                              ? null
                              : projects
                                  .map((p) => ({ label: p.name, value: p.id }))
                                  .filter((p) => p.value === formData?.projectId)
                                  .at(0) || null
                          }
                          loadingText="Loading Projects"
                          options={projects.map((p) => ({ label: p.name, value: p.id }))}
                          selectedAriaLabel={formData?.projectId}
                          onChange={({ detail: { selectedOption } }) => {
                            setFormData({ ...formData, projectId: selectedOption.value });
                          }}
                          statusType={areProjectsLoading ? 'loading' : 'finished'}
                        />
                      </FormField>
                      <FormField errorText={formErrors?.envTypeConfigIdError}>
                        <Header>
                          Configuration ({envTypeConfigs.length}) <Link href="#">Info</Link>
                        </Header>
                        <EnvTypeConfigCards
                          isLoading={envTypeConfigsLoading}
                          allItems={envTypeConfigs}
                          OnSelect={(selected) => OnSelectEnvTypeConfig(selected.selectedItems)}
                        />
                      </FormField>
                      <FormField
                        label="Description - optional"
                        constraintText="Description cannot be longer than 500 characters."
                        errorText={formErrors?.descriptionError}
                      >
                        <Textarea
                          onChange={({ detail: { value } }) =>
                            setFormData({ ...formData, description: value })
                          }
                          value={formData?.description || ''}
                          placeholder="Description"
                        />
                      </FormField>
                    </SpaceBetween>
                  </ExpandableSection>
                </SpaceBetween>
              </Form>
            </form>
          </Box>
        </Container>
      }
      contentType="form"
    />
  );
};

export default Environment;
