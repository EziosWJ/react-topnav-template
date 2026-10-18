import { useEffect } from 'react';
import { Alert, App, Button, Form } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProjectFormFields,
  projectFormDefaults,
  projectToFormValues,
  projectValuesToInput,
  type ProjectFormValues,
} from '../../features/projects/components/ProjectFormFields';
import { useCreateProject, useProject, useUpdateProject } from '../../features/projects/queries';
import { copy } from '../../config/copy';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FormPage } from '../../components/FormPage/FormPage';
import { ErrorState, LoadingState } from '../../components/AsyncState/AsyncState';
import { applyServerFieldErrors } from '../../lib/forms';


export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProjectFormValues>();
  const projectQuery = useProject(id);
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  useEffect(() => {
    if (isEdit && projectQuery.data) {
      form.setFieldsValue(projectToFormValues(projectQuery.data));
    } else if (!isEdit) {
      form.setFieldsValue(projectFormDefaults);
    }
  }, [form, isEdit, projectQuery.data]);

  if (isEdit && projectQuery.isPending) return <LoadingState label="正在加载项目资料…" />;
  if (isEdit && projectQuery.error) {
    return <ErrorState error={projectQuery.error} title="项目资料加载失败" onRetry={() => void projectQuery.refetch()} />;
  }
  if (isEdit && !projectQuery.data) {
    return <ErrorState error={new Error('项目不存在或已被删除')} title="无法编辑项目" />;
  }

  const handleFinish = async (values: ProjectFormValues) => {
    const payload = projectValuesToInput(values);
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input: payload });
        message.success('项目已更新');
        navigate(`/projects/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        message.success('项目已创建');
        navigate(`/projects/${created.id}`);
      }
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const handleCancel = () => {
    if (isEdit && id) navigate(`/projects/${id}`);
    else navigate('/projects');
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? `${copy.actions.editProject}${projectQuery.data ? `：${projectQuery.data.name}` : ''}` : copy.actions.newProject}
        description={isEdit ? '更新项目信息、进度与预算。' : '选择客户并填写项目周期、负责人和预算。'}
        extra={
          <Button icon={<ArrowLeft size={15} />} onClick={handleCancel}>
            返回
          </Button>
        }
      />
      {isEdit && projectQuery.data && !projectQuery.data.customer && (
        <Alert
          type="warning"
          showIcon
          className="detail-alert"
          title="原关联客户已不存在"
          description="保存前请重新选择有效的关联客户。"
        />
      )}
      <FormPage<ProjectFormValues>
        form={form}
        onFinish={handleFinish}
        onCancel={handleCancel}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={isEdit ? updateMutation.error : createMutation.error}
        submitText={isEdit ? copy.form.saveChanges : copy.actions.createProject}
      >
        <ProjectFormFields />
      </FormPage>
    </div>
  );
}
