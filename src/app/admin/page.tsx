/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Mail,
  Monitor,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Tv,
  Users,
  Video,
  X,
} from 'lucide-react';
import { GripVertical } from 'lucide-react';
import {
  Fragment,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import {
  ALL_FEATURE_PERMISSION_KEYS,
  FEATURE_PERMISSION_OPTIONS,
} from '@/lib/feature-permissions';

import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';

// 统一按钮样式系统
const buttonStyles = {
  // 主要操作按钮（蓝色）- 用于配置、设置、确认等
  primary:
    'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors',
  // 成功操作按钮（绿色）- 用于添加、启用、保存等
  success:
    'px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors',
  // 危险操作按钮（红色）- 用于删除、禁用、重置等
  danger:
    'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors',
  // 次要操作按钮（灰色）- 用于取消、关闭等
  secondary:
    'px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors',
  // 警告操作按钮（黄色）- 用于批量禁用等
  warning:
    'px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-colors',
  // 小尺寸主要按钮
  primarySmall:
    'px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors',
  // 小尺寸成功按钮
  successSmall:
    'px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md transition-colors',
  // 小尺寸危险按钮
  dangerSmall:
    'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors',
  // 小尺寸次要按钮
  secondarySmall:
    'px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors',
  // 小尺寸警告按钮
  warningSmall:
    'px-2 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-md transition-colors',
  // 圆角小按钮（用于表格操作）
  roundedPrimary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 transition-colors',
  roundedSuccess:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-200 transition-colors',
  roundedDanger:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-200 transition-colors',
  roundedSecondary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 dark:text-gray-200 transition-colors',
  roundedWarning:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 dark:text-yellow-200 transition-colors',
  roundedPurple:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-200 transition-colors',
  // 禁用状态
  disabled:
    'px-3 py-1.5 text-sm font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-lg transition-colors',
  disabledSmall:
    'px-2 py-1 text-xs font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-md transition-colors',
  // 开关按钮样式
  toggleOn: 'bg-green-600 dark:bg-green-600',
  toggleOff: 'bg-gray-200 dark:bg-gray-700',
  toggleThumb: 'bg-white',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
  // 快速操作按钮样式
  quickAction:
    'px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors',
};

const DEFAULT_GROUP_PERMISSIONS = [...ALL_FEATURE_PERMISSION_KEYS];

// 通用弹窗组件
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
  onConfirm?: () => void;
}

const AlertModal = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  timer,
  showConfirm = false,
  onConfirm,
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (timer) {
        setTimeout(() => {
          onClose();
        }, timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className='w-8 h-8 text-green-500' />;
      case 'error':
        return <AlertCircle className='w-8 h-8 text-red-500' />;
      case 'warning':
        return <AlertTriangle className='w-8 h-8 text-yellow-500' />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-[10050] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full border ${getBgColor()} transition-all duration-200 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className='p-6 text-center'>
          <div className='flex justify-center mb-4'>{getIcon()}</div>

          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            {title}
          </h3>

          {message && (
            <p className='text-gray-600 dark:text-gray-400 mb-4'>{message}</p>
          )}

          {showConfirm ? (
            onConfirm ? (
              // 确认操作：显示取消和确定按钮
              <div className='flex gap-3 justify-center'>
                <button
                  onClick={() => {
                    onClose();
                  }}
                  className={buttonStyles.secondary}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    // 不要在这里调用onClose，让onConfirm自己决定何时关闭
                  }}
                  className={buttonStyles.danger}
                >
                  确定
                </button>
              </div>
            ) : (
              // 普通提示：只显示确定按钮
              <button onClick={onClose} className={buttonStyles.primary}>
                确定
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

// 弹窗状态管理
const useAlertModal = () => {
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message?: string;
    timer?: number;
    showConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
  });

  const showAlert = (config: Omit<typeof alertModal, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
};

// 统一弹窗方法（必须在首次使用前定义）
const showError = (message: string, showAlert?: (config: any) => void) => {
  if (showAlert) {
    showAlert({ type: 'error', title: '错误', message, showConfirm: true });
  } else {
    console.error(message);
  }
};

const showSuccess = (message: string, showAlert?: (config: any) => void) => {
  if (showAlert) {
    showAlert({ type: 'success', title: '成功', message, timer: 2000 });
  } else {
    console.log(message);
  }
};

// 通用加载状态管理系统
interface LoadingState {
  [key: string]: boolean;
}

const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  const isLoading = (key: string) => loadingStates[key] || false;

  const withLoading = async (
    key: string,
    operation: () => Promise<any>
  ): Promise<any> => {
    setLoading(key, true);
    try {
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  };

  return { loadingStates, setLoading, isLoading, withLoading };
};

interface StandaloneSourceScript {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  version: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

// 新增站点配置类型
interface SiteConfig {
  SiteName: string;
  Announcement: string;
  AnnouncementDisplayMode?: 'once' | 'every';
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  DoubanProxyType: string;
  DoubanProxy: string;
  DoubanImageProxyType: string;
  DoubanImageProxy: string;
  DisableYellowFilter: boolean;
  FluidSearch: boolean;




  TMDBApiKey?: string;
  TMDBProxy?: string;
  TMDBReverseProxy?: string;
  TMDBImageBaseUrl?: string;





  BannerDataSource?: string;
  RecommendationDataSource?: string;















  LoginRequireTurnstile?: boolean;
  TurnstileSiteKey?: string;
  TurnstileSecretKey?: string;
  DefaultUserTags?: string[];














}

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
  proxyMode?: boolean;
  weight?: number;
  special?: boolean;
}

// 直播源数据类型
interface LiveDataSource {
  name: string;
  key: string;
  url: string;
  ua?: string;
  epg?: string;
  channelNumber?: number;
  disabled?: boolean;
  from: 'config' | 'custom';
  proxyMode?: 'full' | 'm3u8-only' | 'direct'; // 代理模式
}

// 自定义分类数据类型
interface CustomCategory {
  name?: string;
  type: 'movie' | 'tv';
  query: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 可折叠标签组件
interface CollapsibleTabProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isParent?: boolean;
}

const CollapsibleTab = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  isParent = false,
}: CollapsibleTabProps) => {
  return (
    <div
      className={`rounded-xl shadow-sm mb-4 overflow-hidden ${
        isParent
          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 ring-2 ring-yellow-400/50 dark:ring-yellow-600/50'
          : 'bg-white/80 backdrop-blur-md dark:bg-gray-800/50 dark:ring-1 dark:ring-gray-700'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
          isParent
            ? 'bg-yellow-100/50 dark:bg-yellow-900/30 hover:bg-yellow-100/70 dark:hover:bg-yellow-900/40'
            : 'bg-gray-50/70 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-700/60'
        }`}
      >
        <div className='flex items-center gap-3'>
          {icon}
          <h3
            className={`text-lg font-medium ${
              isParent
                ? 'text-yellow-900 dark:text-yellow-200'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {title}
          </h3>
        </div>
        <div
          className={
            isParent
              ? 'text-yellow-700 dark:text-yellow-400'
              : 'text-gray-500 dark:text-gray-400'
          }
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div className={isParent ? 'px-0.5 md:px-6 py-4' : 'px-6 py-4'}>
          {children}
        </div>
      )}
    </div>
  );
};

// 用户配置组件
interface UserConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  usersV2: Array<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    banned: boolean;
    tags?: string[];

    enabledApis?: string[];
    created_at: number;
  }> | null;
  userPage: number;
  userTotalPages: number;
  userTotal: number;
  fetchUsersV2: (page: number, search?: string) => Promise<void>;
  userListLoading: boolean;
  userSearch: string;
  setUserSearch: (value: string) => void;
}

const UserConfig = ({
  config,
  role,
  refreshConfig,
  usersV2,
  userPage,
  userTotalPages,
  userTotal,
  fetchUsersV2,
  userListLoading,
  userSearch,
  setUserSearch,
}: UserConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showAddUserGroupForm, setShowAddUserGroupForm] = useState(false);
  const [showEditUserGroupForm, setShowEditUserGroupForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    userGroup: '', // 新增用户组字段
  });
  const [changePasswordUser, setChangePasswordUser] = useState({
    username: '',
    password: '',
  });
  const [newUserGroup, setNewUserGroup] = useState({
    name: '',
    enabledApis: [] as string[],
    permissions: [...DEFAULT_GROUP_PERMISSIONS] as string[],
  });
  const [editingUserGroup, setEditingUserGroup] = useState<{
    name: string;
    enabledApis: string[];
    permissions: string[];
  } | null>(null);
  const [showConfigureApisModal, setShowConfigureApisModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
    tags?: string[];
  } | null>(null);
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [showConfigureUserGroupModal, setShowConfigureUserGroupModal] =
    useState(false);
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  } | null>(null);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBatchUserGroupModal, setShowBatchUserGroupModal] = useState(false);
  const [selectedUserGroup, setSelectedUserGroup] = useState<string>('');
  const [showDeleteUserGroupModal, setShowDeleteUserGroupModal] =
    useState(false);
  const [deletingUserGroup, setDeletingUserGroup] = useState<{
    name: string;
    affectedUsers: Array<{
      username: string;
      role: 'user' | 'admin' | 'owner';
    }>;
  } | null>(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showUserDevicesModal, setShowUserDevicesModal] = useState(false);
  const [selectedDeviceUsername, setSelectedDeviceUsername] = useState<
    string | null
  >(null);
  const [userDevices, setUserDevices] = useState<
    Array<{
      tokenId: string;
      deviceInfo: string;
      createdAt: number;
      lastUsed: number;
      expiresAt: number;
      isCurrent?: boolean;
    }>
  >([]);
  const [userDevicesLoading, setUserDevicesLoading] = useState(false);
  const [revokingUserDevice, setRevokingUserDevice] = useState<string | null>(
    null
  );
  const trimmedUserSearch = userSearch.trim();

  // 当前登录用户名
  const currentUsername = getAuthInfoFromBrowserCookie()?.username || null;

  // 查看用户设备弹窗打开时锁定背景滚动，避免滚动穿透
  useEffect(() => {
    if (!showUserDevicesModal) return;

    const scrollY = window.scrollY;
    const originalStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      document.body.style.overflow = originalStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [showUserDevicesModal]);

  // 判断是否有旧版用户数据需要迁移
  const hasOldUserData =
    config?.UserConfig?.Users?.filter((u: any) => u.role !== 'owner').length ??
    0 > 0;

  // 使用新版本用户列表（如果可用且没有旧数据），否则使用配置中的用户列表
  const displayUsers: Array<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    banned?: boolean;
    enabledApis?: string[];
    tags?: string[];
    created_at?: number;

  }> = !hasOldUserData && usersV2 ? usersV2 : config?.UserConfig?.Users || [];

  // 使用 useMemo 计算全选状态，避免每次渲染都重新计算
  const selectAllUsers = useMemo(() => {
    const selectableUserCount =
      displayUsers?.filter(
        (user) =>
          role === 'owner' ||
          (role === 'admin' &&
            (user.role === 'user' || user.username === currentUsername))
      ).length || 0;
    return selectedUsers.size === selectableUserCount && selectedUsers.size > 0;
  }, [selectedUsers.size, displayUsers, role, currentUsername]);

  // 获取用户组列表
  const userGroups = config?.UserConfig?.Tags || [];

  // 处理用户组相关操作
  const handleUserGroupAction = async (
    action: 'add' | 'edit' | 'delete',
    groupName: string,
    enabledApis?: string[],
    permissions?: string[]
  ) => {
    return withLoading(`userGroup_${action}_${groupName}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'userGroup',
            groupAction: action,
            groupName,
            enabledApis,
            permissions,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();

        if (action === 'add') {
          setNewUserGroup({
            name: '',
            enabledApis: [],
            permissions: [...DEFAULT_GROUP_PERMISSIONS],
          });
          setShowAddUserGroupForm(false);
        } else if (action === 'edit') {
          setEditingUserGroup(null);
          setShowEditUserGroupForm(false);
        }

        showSuccess(
          action === 'add'
            ? '用户组添加成功'
            : action === 'edit'
            ? '用户组更新成功'
            : '用户组删除成功',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  const handleAddUserGroup = () => {
    if (!newUserGroup.name.trim()) return;
    handleUserGroupAction(
      'add',
      newUserGroup.name,
      newUserGroup.enabledApis,
      newUserGroup.permissions
    );
  };

  const handleEditUserGroup = () => {
    if (!editingUserGroup?.name.trim()) return;
    handleUserGroupAction(
      'edit',
      editingUserGroup.name,
      editingUserGroup.enabledApis,
      editingUserGroup.permissions
    );
  };

  const handleDeleteUserGroup = (groupName: string) => {
    // 计算会受影响的用户数量
    const affectedUsers =
      config?.UserConfig?.Users?.filter(
        (user) => user.tags && user.tags.includes(groupName)
      ) || [];

    setDeletingUserGroup({
      name: groupName,
      affectedUsers: affectedUsers.map((u) => ({
        username: u.username,
        role: u.role,
      })),
    });
    setShowDeleteUserGroupModal(true);
  };

  const handleConfirmDeleteUserGroup = async () => {
    if (!deletingUserGroup) return;

    try {
      await handleUserGroupAction('delete', deletingUserGroup.name);
      setShowDeleteUserGroupModal(false);
      setDeletingUserGroup(null);
    } catch (err) {
      // 错误处理已在 handleUserGroupAction 中处理
    }
  };

  const handleStartEditUserGroup = (group: {
    name: string;
    enabledApis: string[];
    permissions?: string[];
  }) => {
    setEditingUserGroup({
      ...group,
      permissions: group.permissions || [],
    });
    setShowEditUserGroupForm(true);
    setShowAddUserGroupForm(false);
  };

  // 为用户分配用户组
  const handleAssignUserGroup = async (
    username: string,
    userGroups: string[]
  ) => {
    return withLoading(`assignUserGroup_${username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: username,
            action: 'updateUserGroups',
            userGroups,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess('用户组分配成功', showAlert);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  const handleBanUser = async (uname: string) => {
    await withLoading(`banUser_${uname}`, () => handleUserAction('ban', uname));
  };

  const handleUnbanUser = async (uname: string) => {
    await withLoading(`unbanUser_${uname}`, () =>
      handleUserAction('unban', uname)
    );
  };

  const handleSetAdmin = async (uname: string) => {
    await withLoading(`setAdmin_${uname}`, () =>
      handleUserAction('setAdmin', uname)
    );
  };

  const handleRemoveAdmin = async (uname: string) => {
    await withLoading(`removeAdmin_${uname}`, () =>
      handleUserAction('cancelAdmin', uname)
    );
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await withLoading('addUser', async () => {
      await handleUserAction(
        'add',
        newUser.username,
        newUser.password,
        newUser.userGroup
      );
      setNewUser({ username: '', password: '', userGroup: '' });
      setShowAddUserForm(false);
    });
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser.username || !changePasswordUser.password) return;
    await withLoading(
      `changePassword_${changePasswordUser.username}`,
      async () => {
        await handleUserAction(
          'changePassword',
          changePasswordUser.username,
          changePasswordUser.password
        );
        setChangePasswordUser({ username: '', password: '' });
        setShowChangePasswordForm(false);
      }
    );
  };

  const handleShowChangePasswordForm = (username: string) => {
    setChangePasswordUser({ username, password: '' });
    setShowChangePasswordForm(true);
    setShowAddUserForm(false); // 关闭添加用户表单
  };

  const handleDeleteUser = (username: string) => {
    setDeletingUser(username);
    setShowDeleteUserModal(true);
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase();

    if (
      info.includes('mobile') ||
      info.includes('iphone') ||
      info.includes('android')
    ) {
      return Smartphone;
    }

    if (info.includes('tablet') || info.includes('ipad')) {
      return Tablet;
    }

    return Monitor;
  };

  const handleViewUserDevices = async (username: string) => {
    setSelectedDeviceUsername(username);
    setShowUserDevicesModal(true);
    setUserDevices([]);
    setUserDevicesLoading(true);

    try {
      const params = new URLSearchParams({ username });
      const res = await fetch(`/api/admin/user-devices?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `获取设备失败: ${res.status}`);
      }

      const data = await res.json();
      setUserDevices(Array.isArray(data.devices) ? data.devices : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : '获取设备失败', showAlert);
      setShowUserDevicesModal(false);
      setSelectedDeviceUsername(null);
    } finally {
      setUserDevicesLoading(false);
    }
  };

  const handleRevokeUserDevice = async (tokenId: string) => {
    if (!selectedDeviceUsername) return;

    setRevokingUserDevice(tokenId);
    try {
      const res = await fetch('/api/admin/user-devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedDeviceUsername,
          tokenId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `登出设备失败: ${res.status}`);
      }

      setUserDevices((prev) =>
        prev.filter((device) => device.tokenId !== tokenId)
      );
      showSuccess('设备已登出', showAlert);
    } catch (err) {
      showError(err instanceof Error ? err.message : '登出设备失败', showAlert);
    } finally {
      setRevokingUserDevice(null);
    }
  };

  const handleConfigureUserApis = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
  }) => {
    setSelectedUser(user);
    setSelectedApis(user.enabledApis || []);
    setShowConfigureApisModal(true);
  };

  const handleConfigureUserGroup = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  }) => {
    setSelectedUserForGroup(user);
    setSelectedUserGroups(user.tags || []);
    setShowConfigureUserGroupModal(true);
  };

  const handleSaveUserGroups = async () => {
    if (!selectedUserForGroup) return;

    await withLoading(
      `saveUserGroups_${selectedUserForGroup.username}`,
      async () => {
        try {
          await handleAssignUserGroup(
            selectedUserForGroup.username,
            selectedUserGroups
          );
          setShowConfigureUserGroupModal(false);
          setSelectedUserForGroup(null);
          setSelectedUserGroups([]);
        } catch (err) {
          // 错误处理已在 handleAssignUserGroup 中处理
        }
      }
    );
  };

  // 处理用户选择
  const handleSelectUser = useCallback((username: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const newSelectedUsers = new Set(prev);
      if (checked) {
        newSelectedUsers.add(username);
      } else {
        newSelectedUsers.delete(username);
      }
      return newSelectedUsers;
    });
  }, []);

  const handleSelectAllUsers = useCallback(
    (checked: boolean) => {
      if (checked) {
        // 只选择自己有权限操作的用户
        const selectableUsernames =
          displayUsers
            ?.filter(
              (user) =>
                role === 'owner' ||
                (role === 'admin' &&
                  (user.role === 'user' || user.username === currentUsername))
            )
            .map((u) => u.username) || [];
        setSelectedUsers(new Set(selectableUsernames));
      } else {
        setSelectedUsers(new Set());
      }
    },
    [displayUsers, role, currentUsername]
  );

  // 批量设置用户组
  const handleBatchSetUserGroup = async (userGroup: string) => {
    if (selectedUsers.size === 0) return;

    await withLoading('batchSetUserGroup', async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchUpdateUserGroups',
            usernames: Array.from(selectedUsers),
            userGroups: userGroup === '' ? [] : [userGroup],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        const userCount = selectedUsers.size;
        setSelectedUsers(new Set());
        setShowBatchUserGroupModal(false);
        setSelectedUserGroup('');
        showSuccess(
          `已为 ${userCount} 个用户设置用户组: ${userGroup}`,
          showAlert
        );

        // 刷新配置
        await refreshConfig();
      } catch (err) {
        showError('批量设置用户组失败', showAlert);
        throw err;
      }
    });
  };

  // 提取URL域名的辅助函数
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // 如果URL格式不正确，返回原字符串
      return url;
    }
  };

  const handleSaveUserApis = async () => {
    if (!selectedUser) return;

    await withLoading(`saveUserApis_${selectedUser.username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: selectedUser.username,
            action: 'updateUserApis',
            enabledApis: selectedApis,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        // 成功后刷新配置
        await refreshConfig();
        setShowConfigureApisModal(false);
        setSelectedUser(null);
        setSelectedApis([]);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  // 通用请求函数
  const handleUserAction = async (
    action:
      | 'add'
      | 'ban'
      | 'unban'
      | 'setAdmin'
      | 'cancelAdmin'
      | 'changePassword'
      | 'deleteUser',
    targetUsername: string,
    targetPassword?: string,
    userGroup?: string
  ) => {
    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUsername,
          ...(targetPassword ? { targetPassword } : {}),
          ...(userGroup ? { userGroup } : {}),
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      // 成功后刷新配置和用户列表（refreshConfig 已经是 refreshConfigAndUsers）
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    await withLoading(`deleteUser_${deletingUser}`, async () => {
      try {
        await handleUserAction('deleteUser', deletingUser);
        setShowDeleteUserModal(false);
        setDeletingUser(null);
      } catch (err) {
        // 错误处理已在 handleUserAction 中处理
      }
    });
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 用户统计 */}
      <div>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
          用户统计
        </h4>
        <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
          <div className='text-2xl font-bold text-green-800 dark:text-green-300'>
            {!hasOldUserData && usersV2 ? userTotal : displayUsers.length}
          </div>
          <div className='text-sm text-green-600 dark:text-green-400'>
            总用户数
          </div>
        </div>

        {/* 数据迁移提示 */}
        {config.UserConfig.Users &&
          config.UserConfig.Users.filter((u) => u.role !== 'owner').length >
            0 && (
            <div className='mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <h5 className='text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1'>
                    检测到旧版用户数据
                  </h5>
                  <p className='text-xs text-yellow-600 dark:text-yellow-400'>
                    建议迁移到新的用户存储结构，以获得更好的性能和安全性。迁移后用户密码将使用SHA256加密。
                  </p>
                </div>
                <button
                  onClick={() => {
                    showAlert({
                      type: 'warning',
                      title: '确认迁移用户数据',
                      message:
                        '迁移过程中请勿关闭页面。迁移完成后，所有用户密码将使用SHA256加密存储。',
                      showConfirm: true,
                      onConfirm: async () => {
                        hideAlert();
                        await withLoading('migrateUsers', async () => {
                          try {
                            const response = await fetch(
                              '/api/admin/migrate-users',
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                              }
                            );

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.error || '迁移失败');
                            }

                            showAlert({
                              type: 'success',
                              title: '用户数据迁移成功',
                              message: '所有用户已迁移到新的存储结构',
                              timer: 2000,
                            });
                            await refreshConfig();
                          } catch (error: any) {
                            console.error('迁移用户数据失败:', error);
                            showAlert({
                              type: 'error',
                              title: '迁移失败',
                              message:
                                error.message || '迁移用户数据时发生错误',
                            });
                          }
                        });
                      },
                    });
                  }}
                  disabled={isLoading('migrateUsers')}
                  className={`ml-4 ${buttonStyles.warning} ${
                    isLoading('migrateUsers')
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isLoading('migrateUsers') ? '迁移中...' : '立即迁移'}
                </button>
              </div>
            </div>
          )}
      </div>

      {/* 用户组管理 */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            用户组管理
          </h4>
          <button
            onClick={() => {
              setShowAddUserGroupForm(!showAddUserGroupForm);
              if (showEditUserGroupForm) {
                setShowEditUserGroupForm(false);
                setEditingUserGroup(null);
              }
            }}
            className={
              showAddUserGroupForm
                ? buttonStyles.secondary
                : buttonStyles.primary
            }
          >
            {showAddUserGroupForm ? '取消' : '添加用户组'}
          </button>
        </div>

        {/* 用户组列表 */}
        <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[20rem] overflow-y-auto overflow-x-auto relative'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  用户组名称
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  可用视频源
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  功能权限
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
              {userGroups.map((group) => (
                <tr
                  key={group.name}
                  className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {group.name}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-sm text-gray-900 dark:text-gray-100'>
                        {group.enabledApis && group.enabledApis.length > 0
                          ? `${group.enabledApis.length} 个源`
                          : '无限制'}
                      </span>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span className='text-sm text-gray-900 dark:text-gray-100'>
                      {group.permissions && group.permissions.length > 0
                        ? `${group.permissions.length} 项`
                        : '无'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                    <button
                      onClick={() => handleStartEditUserGroup(group)}
                      disabled={isLoading(`userGroup_edit_${group.name}`)}
                      className={`${buttonStyles.roundedPrimary} ${
                        isLoading(`userGroup_edit_${group.name}`)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteUserGroup(group.name)}
                      className={buttonStyles.roundedDanger}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {userGroups.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
                  >
                    暂无用户组，请添加用户组来管理用户权限
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 用户列表 */}
      <div>
        <div className='mb-3 space-y-3'>
          <div className='flex items-center justify-between gap-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              用户列表
            </h4>
            <button
              onClick={() => {
                setShowAddUserForm(!showAddUserForm);
                if (showChangePasswordForm) {
                  setShowChangePasswordForm(false);
                  setChangePasswordUser({ username: '', password: '' });
                }
              }}
              className={
                showAddUserForm ? buttonStyles.secondary : buttonStyles.success
              }
            >
              {showAddUserForm ? '取消' : '添加用户'}
            </button>
          </div>
          <div className='flex w-full flex-wrap items-center justify-end gap-2'>
            {!hasOldUserData && usersV2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSelectedUsers(new Set());
                  fetchUsersV2(1, trimmedUserSearch);
                }}
                className='ml-auto flex min-w-0 items-center gap-2'
              >
                <div className='relative w-44 sm:w-56'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    type='text'
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder='按用户名搜索'
                    className='w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
                {trimmedUserSearch && (
                  <button
                    type='button'
                    onClick={() => {
                      setUserSearch('');
                      setSelectedUsers(new Set());
                      fetchUsersV2(1, '');
                    }}
                    disabled={userListLoading}
                    aria-label='清空搜索'
                    title='清空'
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      userListLoading
                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'
                        : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white'
                    }`}
                  >
                    <X className='h-4 w-4' />
                  </button>
                )}
                <button
                  type='submit'
                  disabled={userListLoading}
                  aria-label='搜索用户'
                  title='搜索'
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    userListLoading
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
                  }`}
                >
                  <Search className='h-4 w-4' />
                </button>
              </form>
            )}
            {/* 批量操作按钮 */}
            {selectedUsers.size > 0 && (
              <>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-3'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    已选择 {selectedUsers.size} 个用户
                  </span>
                  <button
                    onClick={() => setShowBatchUserGroupModal(true)}
                    className={buttonStyles.primary}
                  >
                    批量设置用户组
                  </button>
                </div>
                <div className='hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600'></div>
              </>
            )}
          </div>
        </div>

        {/* 添加用户表单 */}
        {showAddUserForm && (
          <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <input
                  type='text'
                  placeholder='用户名'
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                />
                <input
                  type='password'
                  placeholder='密码'
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  用户组（可选）
                </label>
                <select
                  value={newUser.userGroup}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      userGroup: e.target.value,
                    }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                >
                  <option value=''>无用户组（无限制）</option>
                  {userGroups.map((group) => (
                    <option key={group.name} value={group.name}>
                      {group.name} (
                      {group.enabledApis && group.enabledApis.length > 0
                        ? `${group.enabledApis.length} 个源`
                        : '无限制'}
                      )
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex justify-end'>
                <button
                  onClick={handleAddUser}
                  disabled={
                    !newUser.username ||
                    !newUser.password ||
                    isLoading('addUser')
                  }
                  className={
                    !newUser.username ||
                    !newUser.password ||
                    isLoading('addUser')
                      ? buttonStyles.disabled
                      : buttonStyles.success
                  }
                >
                  {isLoading('addUser') ? '添加中...' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 修改密码表单 */}
        {showChangePasswordForm && (
          <div className='mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700'>
            <h5 className='text-sm font-medium text-blue-800 dark:text-blue-300 mb-3'>
              修改用户密码
            </h5>
            <div className='flex flex-col sm:flex-row gap-4 sm:gap-3'>
              <input
                type='text'
                placeholder='用户名'
                value={changePasswordUser.username}
                disabled
                className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed'
              />
              <input
                type='password'
                placeholder='新密码'
                value={changePasswordUser.password}
                onChange={(e) =>
                  setChangePasswordUser((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <button
                onClick={handleChangePassword}
                disabled={
                  !changePasswordUser.password ||
                  isLoading(`changePassword_${changePasswordUser.username}`)
                }
                className={`w-full sm:w-auto ${
                  !changePasswordUser.password ||
                  isLoading(`changePassword_${changePasswordUser.username}`)
                    ? buttonStyles.disabled
                    : buttonStyles.primary
                }`}
              >
                {isLoading(`changePassword_${changePasswordUser.username}`)
                  ? '修改中...'
                  : '修改密码'}
              </button>
              <button
                onClick={() => {
                  setShowChangePasswordForm(false);
                  setChangePasswordUser({ username: '', password: '' });
                }}
                className={`w-full sm:w-auto ${buttonStyles.secondary}`}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className='relative'>
          {/* 迁移遮罩层 */}
          {config.UserConfig.Users &&
            config.UserConfig.Users.filter((u) => u.role !== 'owner').length >
              0 && (
              <div className='absolute inset-0 z-20 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 rounded-lg flex items-center justify-center'>
                <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-yellow-200 dark:border-yellow-800 max-w-md'>
                  <div className='flex items-center gap-3 mb-4'>
                    <AlertTriangle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                      需要迁移数据
                    </h3>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                    检测到旧版用户数据，请先迁移到新的存储结构后再进行用户管理操作。
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-500'>
                    请在上方的"用户统计"区域点击"立即迁移"按钮完成数据迁移。
                  </p>
                </div>
              </div>
            )}
          <div
            className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto relative'
            data-table='user-list'
          >
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                <tr>
                  <th className='w-4' />
                  <th className='w-10 px-1 py-3 text-center'>
                    {(() => {
                      // 检查是否有权限操作任何用户
                      const hasAnyPermission = displayUsers?.some(
                        (user) =>
                          role === 'owner' ||
                          (role === 'admin' &&
                            (user.role === 'user' ||
                              user.username === currentUsername))
                      );

                      return hasAnyPermission ? (
                        <input
                          type='checkbox'
                          checked={selectAllUsers}
                          onChange={(e) =>
                            handleSelectAllUsers(e.target.checked)
                          }
                          className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                        />
                      ) : (
                        <div className='w-4 h-4' />
                      );
                    })()}
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    用户名
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    角色
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    状态
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    用户组
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    采集源权限
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                  >
                    操作
                  </th>
                </tr>
              </thead>
              {/* 按规则排序用户：自己 -> 站长(若非自己) -> 管理员 -> 其他 */}
              {(() => {
                // 如果正在加载，显示加载状态
                if (userListLoading) {
                  return (
                    <tbody>
                      <tr>
                        <td
                          colSpan={8}
                          className='px-6 py-8 text-center text-gray-500 dark:text-gray-400'
                        >
                          加载中...
                        </td>
                      </tr>
                    </tbody>
                  );
                }

                const sortedUsers = [...displayUsers].sort((a, b) => {
                  type UserInfo = (typeof displayUsers)[number];
                  const priority = (u: UserInfo) => {
                    if (u.username === currentUsername) return 0;
                    if (u.role === 'owner') return 1;
                    if (u.role === 'admin') return 2;
                    return 3;
                  };
                  return priority(a) - priority(b);
                });
                if (sortedUsers.length === 0) {
                  return (
                    <tbody>
                      <tr>
                        <td
                          colSpan={8}
                          className='px-6 py-8 text-center text-gray-500 dark:text-gray-400'
                        >
                          {trimmedUserSearch
                            ? `未找到用户名包含“${trimmedUserSearch}”的用户`
                            : '暂无用户'}
                        </td>
                      </tr>
                    </tbody>
                  );
                }

                return (
                  <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                    {sortedUsers.map((user) => {
                      // 修改密码权限：站长可修改管理员和普通用户密码，管理员可修改普通用户和自己的密码，但任何人都不能修改站长密码
                      const canChangePassword =
                        user.role !== 'owner' && // 不能修改站长密码
                        (role === 'owner' || // 站长可以修改管理员和普通用户密码
                          (role === 'admin' &&
                            (user.role === 'user' ||
                              user.username === currentUsername))); // 管理员可以修改普通用户和自己的密码

                      // 删除用户权限：站长可删除除自己外的所有用户，管理员仅可删除普通用户
                      const canDeleteUser =
                        user.username !== currentUsername &&
                        (role === 'owner' || // 站长可以删除除自己外的所有用户
                          (role === 'admin' && user.role === 'user')); // 管理员仅可删除普通用户

                      // 其他操作权限：不能操作自己，站长可操作所有用户，管理员可操作普通用户
                      const canOperate =
                        user.username !== currentUsername &&
                        (role === 'owner' ||
                          (role === 'admin' && user.role === 'user'));

                      // 查看设备权限：站长可查看所有用户，管理员可查看普通用户和自己
                      const canViewDevices =
                        role === 'owner' ||
                        (role === 'admin' &&
                          (user.role === 'user' ||
                            user.username === currentUsername));
                      return (
                        <tr
                          key={user.username}
                          className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                        >
                          <td className='w-4' />
                          <td className='w-10 px-1 py-3 text-center'>
                            {role === 'owner' ||
                            (role === 'admin' &&
                              (user.role === 'user' ||
                                user.username === currentUsername)) ? (
                              <input
                                type='checkbox'
                                checked={selectedUsers.has(user.username)}
                                onChange={(e) =>
                                  handleSelectUser(
                                    user.username,
                                    e.target.checked
                                  )
                                }
                                className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                              />
                            ) : (
                              <div className='w-4 h-4' />
                            )}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                            <div className='flex items-center gap-2'>
                              <span>{user.username}</span>

                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'owner'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                                  : user.role === 'admin'
                                  ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {user.role === 'owner'
                                ? '站长'
                                : user.role === 'admin'
                                ? '管理员'
                                : '普通用户'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                !user.banned
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                              }`}
                            >
                              {!user.banned ? '正常' : '已封禁'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center space-x-2'>
                              <span className='text-sm text-gray-900 dark:text-gray-100'>
                                {user.tags && user.tags.length > 0
                                  ? user.tags.join(', ')
                                  : '无用户组'}
                              </span>
                              {/* 配置用户组按钮 */}
                              {(role === 'owner' ||
                                (role === 'admin' &&
                                  (user.role === 'user' ||
                                    user.username === currentUsername))) && (
                                <button
                                  onClick={() => handleConfigureUserGroup(user)}
                                  className={buttonStyles.roundedPrimary}
                                >
                                  配置
                                </button>
                              )}
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center space-x-2'>
                              <span className='text-sm text-gray-900 dark:text-gray-100'>
                                {user.enabledApis && user.enabledApis.length > 0
                                  ? `${user.enabledApis.length} 个源`
                                  : '无限制'}
                              </span>
                              {/* 配置采集源权限按钮 */}
                              {(role === 'owner' ||
                                (role === 'admin' &&
                                  (user.role === 'user' ||
                                    user.username === currentUsername))) && (
                                <button
                                  onClick={() => handleConfigureUserApis(user)}
                                  className={buttonStyles.roundedPrimary}
                                >
                                  配置
                                </button>
                              )}
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                            {/* 查看设备按钮 */}
                            {canViewDevices && (
                              <button
                                onClick={() =>
                                  handleViewUserDevices(user.username)
                                }
                                className={buttonStyles.roundedSecondary}
                              >
                                查看设备
                              </button>
                            )}
                            {/* 修改密码按钮 */}
                            {canChangePassword && (
                              <button
                                onClick={() =>
                                  handleShowChangePasswordForm(user.username)
                                }
                                className={buttonStyles.roundedPrimary}
                              >
                                修改密码
                              </button>
                            )}
                            {canOperate && (
                              <>
                                {/* 其他操作按钮 */}
                                {user.role === 'user' && (
                                  <button
                                    onClick={() =>
                                      handleSetAdmin(user.username)
                                    }
                                    disabled={isLoading(
                                      `setAdmin_${user.username}`
                                    )}
                                    className={`${buttonStyles.roundedPurple} ${
                                      isLoading(`setAdmin_${user.username}`)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                    }`}
                                  >
                                    设为管理
                                  </button>
                                )}
                                {user.role === 'admin' && (
                                  <button
                                    onClick={() =>
                                      handleRemoveAdmin(user.username)
                                    }
                                    disabled={isLoading(
                                      `removeAdmin_${user.username}`
                                    )}
                                    className={`${
                                      buttonStyles.roundedSecondary
                                    } ${
                                      isLoading(`removeAdmin_${user.username}`)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                    }`}
                                  >
                                    取消管理
                                  </button>
                                )}
                                {user.role !== 'owner' &&
                                  (!user.banned ? (
                                    <button
                                      onClick={() =>
                                        handleBanUser(user.username)
                                      }
                                      disabled={isLoading(
                                        `banUser_${user.username}`
                                      )}
                                      className={`${
                                        buttonStyles.roundedDanger
                                      } ${
                                        isLoading(`banUser_${user.username}`)
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      封禁
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleUnbanUser(user.username)
                                      }
                                      disabled={isLoading(
                                        `unbanUser_${user.username}`
                                      )}
                                      className={`${
                                        buttonStyles.roundedSuccess
                                      } ${
                                        isLoading(`unbanUser_${user.username}`)
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      解封
                                    </button>
                                  ))}
                              </>
                            )}
                            {/* 删除用户按钮 - 放在最后，使用更明显的红色样式 */}
                            {canDeleteUser && (
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                className={buttonStyles.roundedDanger}
                              >
                                删除用户
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })()}
            </table>
          </div>

          {/* 用户列表分页 */}
          {!hasOldUserData && usersV2 && userTotalPages > 1 && (
            <div className='mt-4 flex items-center justify-between px-4'>
              <div className='text-sm text-gray-600 dark:text-gray-400'>
                {trimmedUserSearch
                  ? `搜索结果 ${userTotal} 个用户`
                  : `共 ${userTotal} 个用户`}
                ，第 {userPage} / {userTotalPages} 页
              </div>
              <div className='flex items-center space-x-2'>
                <button
                  onClick={() => fetchUsersV2(1, trimmedUserSearch)}
                  disabled={userPage === 1}
                  className={`px-3 py-1 text-sm rounded ${
                    userPage === 1
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  首页
                </button>
                <button
                  onClick={() => fetchUsersV2(userPage - 1, trimmedUserSearch)}
                  disabled={userPage === 1}
                  className={`px-3 py-1 text-sm rounded ${
                    userPage === 1
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  上一页
                </button>
                <button
                  onClick={() => fetchUsersV2(userPage + 1, trimmedUserSearch)}
                  disabled={userPage === userTotalPages}
                  className={`px-3 py-1 text-sm rounded ${
                    userPage === userTotalPages
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  下一页
                </button>
                <button
                  onClick={() =>
                    fetchUsersV2(userTotalPages, trimmedUserSearch)
                  }
                  disabled={userPage === userTotalPages}
                  className={`px-3 py-1 text-sm rounded ${
                    userPage === userTotalPages
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  末页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 查看用户设备弹窗 */}
      {showUserDevicesModal &&
        selectedDeviceUsername &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4'
            onClick={() => {
              setShowUserDevicesModal(false);
              setSelectedDeviceUsername(null);
              setUserDevices([]);
            }}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col'
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              style={{ touchAction: 'auto' }}
            >
              <div className='p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
                <div>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    用户设备 - {selectedDeviceUsername}
                  </h3>
                  <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                    查看该用户当前仍有效的登录设备
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserDevicesModal(false);
                    setSelectedDeviceUsername(null);
                    setUserDevices([]);
                  }}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                >
                  <X size={24} />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto overscroll-contain p-6'>
                {userDevicesLoading ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className='h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse'
                      />
                    ))}
                    <div className='text-center text-sm text-gray-500 dark:text-gray-400'>
                      加载中...
                    </div>
                  </div>
                ) : userDevices.length === 0 ? (
                  <div className='text-center py-10'>
                    <Monitor className='w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3' />
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      暂无登录设备
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {userDevices
                      .slice()
                      .sort((a, b) => b.lastUsed - a.lastUsed)
                      .map((device) => {
                        const DeviceIcon = getDeviceIcon(device.deviceInfo);
                        return (
                          <div
                            key={device.tokenId}
                            className={`p-4 rounded-lg border ${
                              device.isCurrent
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className='flex items-start gap-3'>
                              <DeviceIcon className='w-5 h-5 mt-0.5 text-gray-600 dark:text-gray-400 flex-shrink-0' />
                              <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-2'>
                                  <div className='text-sm font-medium text-gray-900 dark:text-gray-100 break-all'>
                                    {device.deviceInfo || '未知设备'}
                                  </div>
                                  {device.isCurrent && (
                                    <span className='px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full whitespace-nowrap'>
                                      当前设备
                                    </span>
                                  )}
                                </div>
                                <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400'>
                                  <div>
                                    登录时间:{' '}
                                    {new Date(device.createdAt).toLocaleString(
                                      'zh-CN'
                                    )}
                                  </div>
                                  <div>
                                    最后活跃:{' '}
                                    {new Date(device.lastUsed).toLocaleString(
                                      'zh-CN'
                                    )}
                                  </div>
                                  <div>
                                    过期时间:{' '}
                                    {new Date(device.expiresAt).toLocaleString(
                                      'zh-CN'
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!device.isCurrent && (
                                <button
                                  onClick={() =>
                                    handleRevokeUserDevice(device.tokenId)
                                  }
                                  disabled={
                                    revokingUserDevice === device.tokenId
                                  }
                                  className='ml-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                                >
                                  {revokingUserDevice === device.tokenId
                                    ? '登出中...'
                                    : '登出'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className='p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end'>
                <button
                  onClick={() => {
                    setShowUserDevicesModal(false);
                    setSelectedDeviceUsername(null);
                    setUserDevices([]);
                  }}
                  className={buttonStyles.secondary}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 配置用户采集源权限弹窗 */}
      {showConfigureApisModal &&
        selectedUser &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowConfigureApisModal(false);
              setSelectedUser(null);
              setSelectedApis([]);
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    配置用户采集源权限 - {selectedUser.username}
                  </h3>
                  <button
                    onClick={() => {
                      setShowConfigureApisModal(false);
                      setSelectedUser(null);
                      setSelectedApis([]);
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-blue-600 dark:text-blue-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                        配置说明
                      </span>
                    </div>
                    <p className='text-sm text-blue-700 dark:text-blue-400 mt-1'>
                      提示：全不选为无限制，选中的采集源将限制用户只能访问这些源
                    </p>
                  </div>
                </div>

                {/* 采集源选择 - 多列布局 */}
                <div className='mb-6'>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                    选择可用的采集源：
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {config?.SourceConfig?.map((source) => (
                      <label
                        key={source.key}
                        className='flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                      >
                        <input
                          type='checkbox'
                          checked={selectedApis.includes(source.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedApis([...selectedApis, source.key]);
                            } else {
                              setSelectedApis(
                                selectedApis.filter((api) => api !== source.key)
                              );
                            }
                          }}
                          className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700'
                        />
                        <div className='flex-1 min-w-0'>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                            {source.name}
                          </div>
                          {source.api && (
                            <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                              {extractDomain(source.api)}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 快速操作按钮 */}
                <div className='flex flex-wrap items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg'>
                  <div className='flex space-x-2'>
                    <button
                      onClick={() => setSelectedApis([])}
                      className={buttonStyles.quickAction}
                    >
                      全不选（无限制）
                    </button>
                    <button
                      onClick={() => {
                        const allApis =
                          config?.SourceConfig?.filter(
                            (source) => !source.disabled
                          ).map((s) => s.key) || [];
                        setSelectedApis(allApis);
                      }}
                      className={buttonStyles.quickAction}
                    >
                      全选
                    </button>
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    已选择：
                    <span className='font-medium text-blue-600 dark:text-blue-400'>
                      {selectedApis.length > 0
                        ? `${selectedApis.length} 个源`
                        : '无限制'}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => {
                      setShowConfigureApisModal(false);
                      setSelectedUser(null);
                      setSelectedApis([]);
                    }}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveUserApis}
                    disabled={isLoading(
                      `saveUserApis_${selectedUser?.username}`
                    )}
                    className={`px-6 py-2.5 text-sm font-medium ${
                      isLoading(`saveUserApis_${selectedUser?.username}`)
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading(`saveUserApis_${selectedUser?.username}`)
                      ? '配置中...'
                      : '确认配置'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 添加用户组弹窗 */}
      {showAddUserGroupForm &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowAddUserGroupForm(false);
              setNewUserGroup({
                name: '',
                enabledApis: [],
                permissions: [...DEFAULT_GROUP_PERMISSIONS],
              });
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    添加新用户组
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddUserGroupForm(false);
                      setNewUserGroup({
                        name: '',
                        enabledApis: [],
                        permissions: [...DEFAULT_GROUP_PERMISSIONS],
                      });
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='space-y-6'>
                  {/* 用户组名称 */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      用户组名称
                    </label>
                    <input
                      type='text'
                      placeholder='请输入用户组名称'
                      value={newUserGroup.name}
                      onChange={(e) =>
                        setNewUserGroup((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                      功能权限
                    </label>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      {FEATURE_PERMISSION_OPTIONS.map((permission) => (
                        <label
                          key={permission.key}
                          className='flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                        >
                          <input
                            type='checkbox'
                            checked={newUserGroup.permissions.includes(
                              permission.key
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserGroup((prev) => ({
                                  ...prev,
                                  permissions: [
                                    ...prev.permissions,
                                    permission.key,
                                  ],
                                }));
                              } else {
                                setNewUserGroup((prev) => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(
                                    (item) => item !== permission.key
                                  ),
                                }));
                              }
                            }}
                            className='mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700'
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {permission.label}
                            </div>
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className='mt-4 flex space-x-2'>
                      <button
                        type='button'
                        onClick={() =>
                          setNewUserGroup((prev) => ({
                            ...prev,
                            permissions: [],
                          }))
                        }
                        className={buttonStyles.quickAction}
                      >
                        全不选
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          setNewUserGroup((prev) => ({
                            ...prev,
                            permissions: [...DEFAULT_GROUP_PERMISSIONS],
                          }))
                        }
                        className={buttonStyles.quickAction}
                      >
                        全选
                      </button>
                    </div>
                  </div>

                  {/* 可用视频源 */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                      可用视频源
                    </label>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                      {config?.SourceConfig?.map((source) => (
                        <label
                          key={source.key}
                          className='flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                        >
                          <input
                            type='checkbox'
                            checked={newUserGroup.enabledApis.includes(
                              source.key
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserGroup((prev) => ({
                                  ...prev,
                                  enabledApis: [
                                    ...prev.enabledApis,
                                    source.key,
                                  ],
                                }));
                              } else {
                                setNewUserGroup((prev) => ({
                                  ...prev,
                                  enabledApis: prev.enabledApis.filter(
                                    (api) => api !== source.key
                                  ),
                                }));
                              }
                            }}
                            className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700'
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                              {source.name}
                            </div>
                            {source.api && (
                              <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                                {extractDomain(source.api)}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* 快速操作按钮 */}
                    <div className='mt-4 flex space-x-2'>
                      <button
                        onClick={() =>
                          setNewUserGroup((prev) => ({
                            ...prev,
                            enabledApis: [],
                          }))
                        }
                        className={buttonStyles.quickAction}
                      >
                        全不选（无限制）
                      </button>
                      <button
                        onClick={() => {
                          const allApis =
                            config?.SourceConfig?.filter(
                              (source) => !source.disabled
                            ).map((s) => s.key) || [];
                          setNewUserGroup((prev) => ({
                            ...prev,
                            enabledApis: allApis,
                          }));
                        }}
                        className={buttonStyles.quickAction}
                      >
                        全选
                      </button>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <button
                      onClick={() => {
                        setShowAddUserGroupForm(false);
                        setNewUserGroup({
                          name: '',
                          enabledApis: [],
                          permissions: [...DEFAULT_GROUP_PERMISSIONS],
                        });
                      }}
                      className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddUserGroup}
                      disabled={
                        !newUserGroup.name.trim() ||
                        isLoading('userGroup_add_new')
                      }
                      className={`px-6 py-2.5 text-sm font-medium ${
                        !newUserGroup.name.trim() ||
                        isLoading('userGroup_add_new')
                          ? buttonStyles.disabled
                          : buttonStyles.primary
                      }`}
                    >
                      {isLoading('userGroup_add_new')
                        ? '添加中...'
                        : '添加用户组'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 编辑用户组弹窗 */}
      {showEditUserGroupForm &&
        editingUserGroup &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowEditUserGroupForm(false);
              setEditingUserGroup(null);
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    编辑用户组 - {editingUserGroup.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowEditUserGroupForm(false);
                      setEditingUserGroup(null);
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='space-y-6'>
                  {/* 可用视频源 */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                      可用视频源
                    </label>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                      {config?.SourceConfig?.map((source) => (
                        <label
                          key={source.key}
                          className='flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                        >
                          <input
                            type='checkbox'
                            checked={editingUserGroup.enabledApis.includes(
                              source.key
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingUserGroup((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        enabledApis: [
                                          ...prev.enabledApis,
                                          source.key,
                                        ],
                                      }
                                    : null
                                );
                              } else {
                                setEditingUserGroup((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        enabledApis: prev.enabledApis.filter(
                                          (api) => api !== source.key
                                        ),
                                      }
                                    : null
                                );
                              }
                            }}
                            className='rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700'
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                              {source.name}
                            </div>
                            {source.api && (
                              <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                                {extractDomain(source.api)}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* 快速操作按钮 */}
                    <div className='mt-4 flex space-x-2'>
                      <button
                        onClick={() =>
                          setEditingUserGroup((prev) =>
                            prev ? { ...prev, enabledApis: [] } : null
                          )
                        }
                        className={buttonStyles.quickAction}
                      >
                        全不选（无限制）
                      </button>
                      <button
                        onClick={() => {
                          const allApis =
                            config?.SourceConfig?.filter(
                              (source) => !source.disabled
                            ).map((s) => s.key) || [];
                          setEditingUserGroup((prev) =>
                            prev ? { ...prev, enabledApis: allApis } : null
                          );
                        }}
                        className={buttonStyles.quickAction}
                      >
                        全选
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                      功能权限
                    </label>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      {FEATURE_PERMISSION_OPTIONS.map((permission) => (
                        <label
                          key={permission.key}
                          className='flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                        >
                          <input
                            type='checkbox'
                            checked={editingUserGroup.permissions.includes(
                              permission.key
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingUserGroup((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        permissions: [
                                          ...prev.permissions,
                                          permission.key,
                                        ],
                                      }
                                    : null
                                );
                              } else {
                                setEditingUserGroup((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        permissions: prev.permissions.filter(
                                          (item) => item !== permission.key
                                        ),
                                      }
                                    : null
                                );
                              }
                            }}
                            className='mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700'
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {permission.label}
                            </div>
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className='mt-4 flex space-x-2'>
                      <button
                        type='button'
                        onClick={() =>
                          setEditingUserGroup((prev) =>
                            prev ? { ...prev, permissions: [] } : null
                          )
                        }
                        className={buttonStyles.quickAction}
                      >
                        全不选
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          setEditingUserGroup((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  permissions: [...DEFAULT_GROUP_PERMISSIONS],
                                }
                              : null
                          )
                        }
                        className={buttonStyles.quickAction}
                      >
                        全选
                      </button>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <button
                      onClick={() => {
                        setShowEditUserGroupForm(false);
                        setEditingUserGroup(null);
                      }}
                      className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleEditUserGroup}
                      disabled={isLoading(
                        `userGroup_edit_${editingUserGroup?.name}`
                      )}
                      className={`px-6 py-2.5 text-sm font-medium ${
                        isLoading(`userGroup_edit_${editingUserGroup?.name}`)
                          ? buttonStyles.disabled
                          : buttonStyles.primary
                      }`}
                    >
                      {isLoading(`userGroup_edit_${editingUserGroup?.name}`)
                        ? '保存中...'
                        : '保存修改'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 配置用户组弹窗 */}
      {showConfigureUserGroupModal &&
        selectedUserForGroup &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowConfigureUserGroupModal(false);
              setSelectedUserForGroup(null);
              setSelectedUserGroups([]);
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    配置用户组 - {selectedUserForGroup.username}
                  </h3>
                  <button
                    onClick={() => {
                      setShowConfigureUserGroupModal(false);
                      setSelectedUserForGroup(null);
                      setSelectedUserGroups([]);
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-blue-600 dark:text-blue-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                        配置说明
                      </span>
                    </div>
                    <p className='text-sm text-blue-700 dark:text-blue-400 mt-1'>
                      提示：选择"无用户组"为无限制，选择特定用户组将限制用户只能访问该用户组允许的采集源
                    </p>
                  </div>
                </div>

                {/* 用户组选择 - 下拉选择器 */}
                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    选择用户组：
                  </label>
                  <select
                    value={
                      selectedUserGroups.length > 0 ? selectedUserGroups[0] : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedUserGroups(value ? [value] : []);
                    }}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                  >
                    <option value=''>无用户组（无限制）</option>
                    {userGroups.map((group) => (
                      <option key={group.name} value={group.name}>
                        {group.name}{' '}
                        {group.enabledApis && group.enabledApis.length > 0
                          ? `(${group.enabledApis.length} 个源)`
                          : ''}
                      </option>
                    ))}
                  </select>
                  <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                    选择"无用户组"为无限制，选择特定用户组将限制用户只能访问该用户组允许的采集源
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => {
                      setShowConfigureUserGroupModal(false);
                      setSelectedUserForGroup(null);
                      setSelectedUserGroups([]);
                    }}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveUserGroups}
                    disabled={isLoading(
                      `saveUserGroups_${selectedUserForGroup?.username}`
                    )}
                    className={`px-6 py-2.5 text-sm font-medium ${
                      isLoading(
                        `saveUserGroups_${selectedUserForGroup?.username}`
                      )
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading(
                      `saveUserGroups_${selectedUserForGroup?.username}`
                    )
                      ? '配置中...'
                      : '确认配置'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 删除用户组确认弹窗 */}
      {showDeleteUserGroupModal &&
        deletingUserGroup &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowDeleteUserGroupModal(false);
              setDeletingUserGroup(null);
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    确认删除用户组
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteUserGroupModal(false);
                      setDeletingUserGroup(null);
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-red-600 dark:text-red-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-red-800 dark:text-red-300'>
                        危险操作警告
                      </span>
                    </div>
                    <p className='text-sm text-red-700 dark:text-red-400'>
                      删除用户组 <strong>{deletingUserGroup.name}</strong>{' '}
                      将影响所有使用该组的用户，此操作不可恢复！
                    </p>
                  </div>

                  {deletingUserGroup.affectedUsers.length > 0 ? (
                    <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <svg
                          className='w-5 h-5 text-yellow-600 dark:text-yellow-400'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        <span className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
                          ⚠️ 将影响 {deletingUserGroup.affectedUsers.length}{' '}
                          个用户：
                        </span>
                      </div>
                      <div className='space-y-1'>
                        {deletingUserGroup.affectedUsers.map((user, index) => (
                          <div
                            key={index}
                            className='text-sm text-yellow-700 dark:text-yellow-300'
                          >
                            • {user.username} ({user.role})
                          </div>
                        ))}
                      </div>
                      <p className='text-xs text-yellow-600 dark:text-yellow-400 mt-2'>
                        这些用户的用户组将被自动移除
                      </p>
                    </div>
                  ) : (
                    <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4'>
                      <div className='flex items-center space-x-2'>
                        <svg
                          className='w-5 h-5 text-green-600 dark:text-green-400'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                        <span className='text-sm font-medium text-green-800 dark:text-green-300'>
                          ✅ 当前没有用户使用此用户组
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => {
                      setShowDeleteUserGroupModal(false);
                      setDeletingUserGroup(null);
                    }}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmDeleteUserGroup}
                    disabled={isLoading(
                      `userGroup_delete_${deletingUserGroup?.name}`
                    )}
                    className={`px-6 py-2.5 text-sm font-medium ${
                      isLoading(`userGroup_delete_${deletingUserGroup?.name}`)
                        ? buttonStyles.disabled
                        : buttonStyles.danger
                    }`}
                  >
                    {isLoading(`userGroup_delete_${deletingUserGroup?.name}`)
                      ? '删除中...'
                      : '确认删除'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 删除用户确认弹窗 */}
      {showDeleteUserModal &&
        deletingUser &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowDeleteUserModal(false);
              setDeletingUser(null);
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    确认删除用户
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteUserModal(false);
                      setDeletingUser(null);
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-red-600 dark:text-red-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-red-800 dark:text-red-300'>
                        危险操作警告
                      </span>
                    </div>
                    <p className='text-sm text-red-700 dark:text-red-400'>
                      删除用户 <strong>{deletingUser}</strong>{' '}
                      将同时删除其搜索历史、播放记录和收藏夹，此操作不可恢复！
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className='flex justify-end space-x-3'>
                    <button
                      onClick={() => {
                        setShowDeleteUserModal(false);
                        setDeletingUser(null);
                      }}
                      className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmDeleteUser}
                      className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.danger}`}
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 批量设置用户组弹窗 */}
      {showBatchUserGroupModal &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => {
              setShowBatchUserGroupModal(false);
              setSelectedUserGroup('');
            }}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    批量设置用户组
                  </h3>
                  <button
                    onClick={() => {
                      setShowBatchUserGroupModal(false);
                      setSelectedUserGroup('');
                    }}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-blue-600 dark:text-blue-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                        批量操作说明
                      </span>
                    </div>
                    <p className='text-sm text-blue-700 dark:text-blue-400'>
                      将为选中的 <strong>{selectedUsers.size} 个用户</strong>{' '}
                      设置用户组，选择"无用户组"为无限制
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      选择用户组：
                    </label>
                    <select
                      onChange={(e) => setSelectedUserGroup(e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                      value={selectedUserGroup}
                    >
                      <option value=''>无用户组（无限制）</option>
                      {userGroups.map((group) => (
                        <option key={group.name} value={group.name}>
                          {group.name}{' '}
                          {group.enabledApis && group.enabledApis.length > 0
                            ? `(${group.enabledApis.length} 个源)`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                      选择"无用户组"为无限制，选择特定用户组将限制用户只能访问该用户组允许的采集源
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => {
                      setShowBatchUserGroupModal(false);
                      setSelectedUserGroup('');
                    }}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleBatchSetUserGroup(selectedUserGroup)}
                    disabled={isLoading('batchSetUserGroup')}
                    className={`px-6 py-2.5 text-sm font-medium ${
                      isLoading('batchSetUserGroup')
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading('batchSetUserGroup') ? '设置中...' : '确认设置'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
        onConfirm={alertModal.onConfirm}
      />
    </div>
  );
};

// 私人影库配置组件




// Emby 媒体库配置组件 - 多源管理版本


// 视频源配置组件
const VideoSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    detail: '',
    disabled: false,
    from: 'config',
  });

  // 批量操作相关状态
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set()
  );

  // 使用 useMemo 计算全选状态，避免每次渲染都重新计算
  const selectAll = useMemo(() => {
    return selectedSources.size === sources.length && selectedSources.size > 0;
  }, [selectedSources.size, sources.length]);

  // 确认弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  // 有效性检测相关状态
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const [showClientAdSourcesModal, setShowClientAdSourcesModal] = useState(false);

  const [clientAdSourceDraftApis, setClientAdSourceDraftApis] = useState<string[]>([]);
  const [weightDraftSources, setWeightDraftSources] = useState<DataSource[]>(
    []
  );
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<
    Array<{
      key: string;
      name: string;
      status: 'valid' | 'no_results' | 'invalid' | 'validating';
      message: string;
      resultCount: number;
    }>
  >([]);

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 轻微位移即可触发
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 长按 150ms 后触发，避免与滚动冲突
        tolerance: 5,
      },
    })
  );

  // 初始化
  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
      // 进入时重置 orderChanged
      setOrderChanged(false);
      // 重置选择状态
      setSelectedSources(new Set());
    }
  }, [config]);

  // 通用 API 请求
  const callSourceApi = async (body: Record<string, any>) => {
    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      // 获取响应数据
      const data = await resp.json();

      // 成功后刷新配置
      await refreshConfig();

      // 返回响应数据供调用者使用
      return data;
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
      throw err; // 向上抛出方便调用处判断
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    withLoading(`toggleSource_${key}`, () =>
      callSourceApi({ action, key })
    ).catch(() => {
      console.error('操作失败', action, key);
    });
  };

  const handleDelete = (key: string) => {
    withLoading(`deleteSource_${key}`, () =>
      callSourceApi({ action: 'delete', key })
    ).catch(() => {
      console.error('操作失败', 'delete', key);
    });
  };

  const handleToggleProxyMode = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;

    // 更新本地状态
    setSources((prev) =>
      prev.map((s) => (s.key === key ? { ...s, proxyMode: !s.proxyMode } : s))
    );

    // 调用API更新
    withLoading(`toggleProxyMode_${key}`, async () => {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_proxy_mode',
            key,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${response.status}`);
        }

        await refreshConfig();
      } catch (error) {
        // 失败时回滚本地状态
        setSources((prev) =>
          prev.map((s) =>
            s.key === key ? { ...s, proxyMode: !s.proxyMode } : s
          )
        );
        showError(
          error instanceof Error ? error.message : '切换代理模式失败',
          showAlert
        );
        throw error;
      }
    }).catch(() => {
      console.error('操作失败', 'toggle_proxy_mode', key);
    });
  };








  const openClientAdSourcesModal = () => {
    setClientAdSourceDraftApis(config?.ClientAdSourceApis || []);
    setShowClientAdSourcesModal(true);
  };

  const closeClientAdSourcesModal = () => {
    setShowClientAdSourcesModal(false);
    setClientAdSourceDraftApis([]);
  };

  const handleSaveClientAdSources = async () => {
    await withLoading('saveClientAdSources', async () => {
      await callSourceApi({
        action: 'set_client_ad_sources',
        keys: clientAdSourceDraftApis,
      });
      closeClientAdSourcesModal();
    }).catch(() => {
      console.error('操作失败', 'set_client_ad_sources');
    });
  };



  const handleUpdateWeight = (key: string, weight: number) => {
    // 先乐观更新本地状态
    setSources((prev) =>
      prev.map((s) => (s.key === key ? { ...s, weight } : s))
    );

    // 调用API更新
    withLoading(`updateWeight_${key}`, async () => {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_weight',
            key,
            weight,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${response.status}`);
        }

        await refreshConfig();
      } catch (error) {
        // 失败时回滚本地状态到配置中的值
        const originalWeight =
          config?.SourceConfig?.find((s) => s.key === key)?.weight ?? 0;
        setSources((prev) =>
          prev.map((s) =>
            s.key === key ? { ...s, weight: originalWeight } : s
          )
        );
        showError(
          error instanceof Error ? error.message : '更新权重失败',
          showAlert
        );
        throw error;
      }
    }).catch(() => {
      console.error('操作失败', 'update_weight', key, weight);
    });
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.key || !newSource.api) return;
    withLoading('addSource', async () => {
      await callSourceApi({
        action: 'add',
        key: newSource.key,
        name: newSource.name,
        api: newSource.api,
        detail: newSource.detail,
      });
      setNewSource({
        name: '',
        key: '',
        api: '',
        detail: '',
        disabled: false,
        from: 'custom',
      });
      setShowAddForm(false);
    }).catch(() => {
      console.error('操作失败', 'add', newSource);
    });
  };

  const buildRecommendedWeightMap = useCallback((list: DataSource[]) => {
    const total = list.length;
    return new Map(
      list.map((source, index) => {
        const recommended =
          total <= 1
            ? 40
            : Math.round(((total - index - 1) * 40) / (total - 1));
        return [source.key, recommended];
      })
    );
  }, []);

  const applyRecommendedWeights = useCallback((list: DataSource[]) => {
    const total = list.length;
    return list.map((source, index) => ({
      ...source,
      weight:
        total <= 1 ? 40 : Math.round(((total - index - 1) * 40) / (total - 1)),
    }));
  }, []);

  const openWeightModal = useCallback(() => {
    setWeightDraftSources(sources.map((source) => ({ ...source })));
    setShowWeightModal(true);
  }, [sources]);

  const handleCloseWeightModal = useCallback(() => {
    setShowWeightModal(false);
    setWeightDraftSources([]);
  }, []);

  useEffect(() => {
    if (!showWeightModal) return;

    const isInsideAllowedScroll = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return !!target.parentElement?.closest('[data-weight-modal-scroll]');
    };

    const preventBackgroundScroll = (event: TouchEvent | WheelEvent) => {
      if (isInsideAllowedScroll(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundScroll, {
      passive: false,
    });
    document.addEventListener('wheel', preventBackgroundScroll, {
      passive: false,
    });

    return () => {
      document.removeEventListener(
        'touchmove',
        preventBackgroundScroll as EventListener
      );
      document.removeEventListener(
        'wheel',
        preventBackgroundScroll as EventListener
      );
    };
  }, [showWeightModal]);

  const handleWeightDraftChange = useCallback((key: string, weight: number) => {
    setWeightDraftSources((prev) =>
      prev.map((source) =>
        source.key === key ? { ...source, weight } : source
      )
    );
  }, []);

  const handleApplyRecommendedWeights = useCallback(() => {
    setWeightDraftSources((prev) => applyRecommendedWeights(prev));
  }, [applyRecommendedWeights]);

  const handleResetWeightDraft = useCallback(() => {
    setWeightDraftSources(sources.map((source) => ({ ...source })));
  }, [sources]);

  const handleWeightModalDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setWeightDraftSources((prev) => {
        const oldIndex = prev.findIndex((source) => source.key === active.id);
        const newIndex = prev.findIndex((source) => source.key === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return applyRecommendedWeights(arrayMove(prev, oldIndex, newIndex));
      });
    },
    [applyRecommendedWeights]
  );

  const recommendedWeightMap = useMemo(
    () => buildRecommendedWeightMap(weightDraftSources),
    [buildRecommendedWeightMap, weightDraftSources]
  );

  const weightModalChanged = useMemo(() => {
    if (weightDraftSources.length !== sources.length) return false;
    return weightDraftSources.some((source, index) => {
      const current = sources[index];
      return (
        !current ||
        current.key !== source.key ||
        (current.weight ?? 0) !== (source.weight ?? 0)
      );
    });
  }, [sources, weightDraftSources]);

  const handleSaveWeightConfig = useCallback(() => {
    withLoading('saveWeightConfig', async () => {
      await callSourceApi({
        action: 'batch_update_weights',
        weights: weightDraftSources.map((source) => ({
          key: source.key,
          weight: source.weight ?? 0,
        })),
        order: weightDraftSources.map((source) => source.key),
      });
      setSources(weightDraftSources.map((source) => ({ ...source })));
      setOrderChanged(false);
      handleCloseWeightModal();
    }).catch(() => {
      console.error('操作失败', 'batch_update_weights');
    });
  }, [callSourceApi, handleCloseWeightModal, weightDraftSources, withLoading]);

  // 有效性检测函数
  const handleValidateSources = async () => {
    if (!searchKeyword.trim()) {
      showAlert({
        type: 'warning',
        title: '请输入搜索关键词',
        message: '搜索关键词不能为空',
      });
      return;
    }

    await withLoading('validateSources', async () => {
      setIsValidating(true);
      setValidationResults([]); // 清空之前的结果
      setShowValidationModal(false); // 立即关闭弹窗

      // 初始化所有视频源为检测中状态
      const initialResults = sources.map((source) => ({
        key: source.key,
        name: source.name,
        status: 'validating' as const,
        message: '检测中...',
        resultCount: 0,
      }));
      setValidationResults(initialResults);

      try {
        // 使用EventSource接收流式数据
        const eventSource = new EventSource(
          `/api/admin/source/validate?q=${encodeURIComponent(
            searchKeyword.trim()
          )}`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'start':
                console.log(`开始检测 ${data.totalSources} 个视频源`);
                break;

              case 'source_result':
              case 'source_error':
                // 更新验证结果
                setValidationResults((prev) => {
                  const existing = prev.find((r) => r.key === data.source);
                  if (existing) {
                    return prev.map((r) =>
                      r.key === data.source
                        ? {
                            key: data.source,
                            name:
                              sources.find((s) => s.key === data.source)
                                ?.name || data.source,
                            status: data.status,
                            message:
                              data.status === 'valid'
                                ? '搜索正常'
                                : data.status === 'no_results'
                                ? '无法搜索到结果'
                                : '连接失败',
                            resultCount: data.status === 'valid' ? 1 : 0,
                          }
                        : r
                    );
                  } else {
                    return [
                      ...prev,
                      {
                        key: data.source,
                        name:
                          sources.find((s) => s.key === data.source)?.name ||
                          data.source,
                        status: data.status,
                        message:
                          data.status === 'valid'
                            ? '搜索正常'
                            : data.status === 'no_results'
                            ? '无法搜索到结果'
                            : '连接失败',
                        resultCount: data.status === 'valid' ? 1 : 0,
                      },
                    ];
                  }
                });
                break;

              case 'complete':
                console.log(
                  `检测完成，共检测 ${data.completedSources} 个视频源`
                );
                eventSource.close();
                setIsValidating(false);
                break;
            }
          } catch (error) {
            console.error('解析EventSource数据失败:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('EventSource错误:', error);
          eventSource.close();
          setIsValidating(false);
          showAlert({
            type: 'error',
            title: '验证失败',
            message: '连接错误，请重试',
          });
        };

        // 设置超时，防止长时间等待
        setTimeout(() => {
          if (eventSource.readyState === EventSource.OPEN) {
            eventSource.close();
            setIsValidating(false);
            showAlert({
              type: 'warning',
              title: '验证超时',
              message: '检测超时，请重试',
            });
          }
        }, 60000); // 60秒超时
      } catch (error) {
        setIsValidating(false);
        showAlert({
          type: 'error',
          title: '验证失败',
          message: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    });
  };

  // 获取有效性状态显示
  const getValidationStatus = (sourceKey: string) => {
    const result = validationResults.find((r) => r.key === sourceKey);
    if (!result) return null;

    switch (result.status) {
      case 'validating':
        return {
          text: '检测中',
          className:
            'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
          icon: '⟳',
          message: result.message,
        };
      case 'valid':
        return {
          text: '有效',
          className:
            'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
          icon: '✓',
          message: result.message,
        };
      case 'no_results':
        return {
          text: '无法搜索',
          className:
            'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
          icon: '⚠',
          message: result.message,
        };
      case 'invalid':
        return {
          text: '无效',
          className:
            'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
          icon: '✗',
          message: result.message,
        };
      default:
        return null;
    }
  };

  const WeightModalInput = memo(
    ({ sourceKey, weight }: { sourceKey: string; weight: number }) => {
      const [localWeight, setLocalWeight] = useState(weight);

      useEffect(() => {
        setLocalWeight(weight);
      }, [weight]);

      const commitWeight = (value: number) => {
        const clampedValue = Math.min(100, Math.max(0, value));
        setLocalWeight(clampedValue);
        handleWeightDraftChange(sourceKey, clampedValue);
      };

      return (
        <div
          className='flex items-center gap-3'
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <input
            type='range'
            min='0'
            max='100'
            value={localWeight}
            onChange={(e) => commitWeight(parseInt(e.target.value) || 0)}
            className='w-full accent-blue-600'
          />
          <input
            type='number'
            inputMode='numeric'
            min='0'
            max='100'
            value={localWeight}
            onChange={(e) => {
              const nextValue = parseInt(e.target.value) || 0;
              const clampedValue = Math.min(100, Math.max(0, nextValue));
              setLocalWeight(clampedValue);
            }}
            onBlur={(e) => commitWeight(parseInt(e.target.value) || 0)}
            className='w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>
      );
    }
  );

  const WeightModalRow = memo(
    ({
      source,
      index,
      recommendedWeight,
    }: {
      source: DataSource;
      index: number;
      recommendedWeight: number;
    }) => {
      const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: source.key });

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      } as React.CSSProperties;

      return (
        <div
          ref={setNodeRef}
          style={style}
          className='grid grid-cols-[88px_minmax(0,1fr)_112px_112px_220px] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow dark:border-gray-700 dark:bg-gray-800/90 dark:hover:border-blue-800'
        >
          <div
            className='flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 cursor-grab'
            style={{ touchAction: 'none' }}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
            <span className='font-medium text-gray-700 dark:text-gray-200'>
              #{index + 1}
            </span>
          </div>
          <div className='min-w-0'>
            <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
              {source.name}
            </div>
            <div className='truncate text-xs text-gray-500 dark:text-gray-400'>
              {source.key}
            </div>
          </div>
          <div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                source.disabled
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              {source.disabled ? '已禁用' : '启用中'}
            </span>
          </div>
          <div>
            <span className='inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
              {recommendedWeight}
            </span>
          </div>
          <WeightModalInput
            sourceKey={source.key}
            weight={source.weight ?? 0}
          />
        </div>
      );
    }
  );

  const SourceRow = memo(({ source }: { source: DataSource }) => {
    return (
      <tr className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
        <td className='px-2 py-4 text-center'>
          <input
            type='checkbox'
            checked={selectedSources.has(source.key)}
            onChange={(e) => handleSelectSource(source.key, e.target.checked)}
            className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
          />
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {source.name}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {source.key}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[12rem] truncate'
          title={source.api}
        >
          {source.api}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[8rem] truncate'
          title={source.detail || '-'}
        >
          {source.detail || '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              !source.disabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}
          >
            {!source.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-center'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleProxyMode(source.key);
            }}
            disabled={isLoading(`toggleProxyMode_${source.key}`)}
            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
              source.proxyMode
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-700'
            } ${
              isLoading(`toggleProxyMode_${source.key}`)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
            title={source.proxyMode ? '代理模式已启用' : '代理模式已禁用'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                source.proxyMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          {(() => {
            const status = getValidationStatus(source.key);
            if (!status) {
              return (
                <span className='px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'>
                  未检测
                </span>
              );
            }
            return (
              <span
                className={`px-2 py-1 text-xs rounded-full ${status.className}`}
                title={status.message}
              >
                {status.icon} {status.text}
              </span>
            );
          })()}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
          <button
            onClick={() => handleToggleEnable(source.key)}
            disabled={isLoading(`toggleSource_${source.key}`)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
              !source.disabled
                ? buttonStyles.roundedDanger
                : buttonStyles.roundedSuccess
            } transition-colors ${
              isLoading(`toggleSource_${source.key}`)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {!source.disabled ? '禁用' : '启用'}
          </button>
          {source.from !== 'config' && (
            <button
              onClick={() => handleDelete(source.key)}
              disabled={isLoading(`deleteSource_${source.key}`)}
              className={`${buttonStyles.roundedSecondary} ${
                isLoading(`deleteSource_${source.key}`)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              删除
            </button>
          )}
        </td>
      </tr>
    );
  });

  // 全选/取消全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allKeys = sources.map((s) => s.key);
        setSelectedSources(new Set(allKeys));
      } else {
        setSelectedSources(new Set());
      }
    },
    [sources]
  );

  // 单个选择
  const handleSelectSource = useCallback((key: string, checked: boolean) => {
    setSelectedSources((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(key);
      } else {
        newSelected.delete(key);
      }
      return newSelected;
    });
  }, []);

  // 批量操作
  const handleBatchOperation = async (
    action: 'batch_enable' | 'batch_disable' | 'batch_delete'
  ) => {
    if (selectedSources.size === 0) {
      showAlert({
        type: 'warning',
        title: '请先选择要操作的视频源',
        message: '请选择至少一个视频源',
      });
      return;
    }

    const keys = Array.from(selectedSources);
    let confirmMessage = '';
    let actionName = '';

    switch (action) {
      case 'batch_enable':
        confirmMessage = `确定要启用选中的 ${keys.length} 个视频源吗？`;
        actionName = '批量启用';
        break;
      case 'batch_disable':
        confirmMessage = `确定要禁用选中的 ${keys.length} 个视频源吗？`;
        actionName = '批量禁用';
        break;
      case 'batch_delete':
        confirmMessage = `确定要删除选中的 ${keys.length} 个视频源吗？此操作不可恢复！`;
        actionName = '批量删除';
        break;
    }

    // 显示确认弹窗
    setConfirmModal({
      isOpen: true,
      title: '确认操作',
      message: confirmMessage,
      onConfirm: async () => {
        try {
          const result = await withLoading(`batchSource_${action}`, () =>
            callSourceApi({ action, keys })
          );

          // 根据操作类型和结果显示不同的消息
          if (
            action === 'batch_delete' &&
            result?.deleted !== undefined &&
            result?.skipped !== undefined
          ) {
            const { deleted, skipped } = result;
            if (skipped > 0) {
              showAlert({
                type: 'warning',
                title: '批量删除完成',
                message: `成功删除了 ${deleted} 个视频源，跳过了 ${skipped} 个配置文件中的源（不可删除）`,
                timer: 3000,
              });
            } else if (deleted > 0) {
              showAlert({
                type: 'success',
                title: '批量删除成功',
                message: `成功删除了 ${deleted} 个视频源`,
                timer: 2000,
              });
            } else {
              showAlert({
                type: 'warning',
                title: '无法删除',
                message: '所选视频源均为配置文件中的源，不可删除',
                timer: 3000,
              });
            }
          } else {
            showAlert({
              type: 'success',
              title: `${actionName}成功`,
              message: `${actionName}了 ${keys.length} 个视频源`,
              timer: 2000,
            });
          }

          // 重置选择状态
          setSelectedSources(new Set());
        } catch (err) {
          showAlert({
            type: 'error',
            title: `${actionName}失败`,
            message: err instanceof Error ? err.message : '操作失败',
          });
        }
        setConfirmModal({
          isOpen: false,
          title: '',
          message: '',
          onConfirm: () => {},
          onCancel: () => {},
        });
      },
      onCancel: () => {
        setConfirmModal({
          isOpen: false,
          title: '',
          message: '',
          onConfirm: () => {},
          onCancel: () => {},
        });
      },
    });
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 添加视频源表单 */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          视频源列表
        </h4>
        <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2'>
          {/* 批量操作按钮 - 移动端显示在下一行，PC端显示在左侧 */}
          {selectedSources.size > 0 && (
            <>
              <div className='flex flex-wrap items-center gap-3 order-2 sm:order-1'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  <span className='sm:hidden'>已选 {selectedSources.size}</span>
                  <span className='hidden sm:inline'>
                    已选择 {selectedSources.size} 个视频源
                  </span>
                </span>
                <button
                  onClick={() => handleBatchOperation('batch_enable')}
                  disabled={isLoading('batchSource_batch_enable')}
                  className={`px-3 py-1 text-sm ${
                    isLoading('batchSource_batch_enable')
                      ? buttonStyles.disabled
                      : buttonStyles.success
                  }`}
                >
                  {isLoading('batchSource_batch_enable')
                    ? '启用中...'
                    : '批量启用'}
                </button>
                <button
                  onClick={() => handleBatchOperation('batch_disable')}
                  disabled={isLoading('batchSource_batch_disable')}
                  className={`px-3 py-1 text-sm ${
                    isLoading('batchSource_batch_disable')
                      ? buttonStyles.disabled
                      : buttonStyles.warning
                  }`}
                >
                  {isLoading('batchSource_batch_disable')
                    ? '禁用中...'
                    : '批量禁用'}
                </button>
                <button
                  onClick={() => handleBatchOperation('batch_delete')}
                  disabled={isLoading('batchSource_batch_delete')}
                  className={`px-3 py-1 text-sm ${
                    isLoading('batchSource_batch_delete')
                      ? buttonStyles.disabled
                      : buttonStyles.danger
                  }`}
                >
                  {isLoading('batchSource_batch_delete')
                    ? '删除中...'
                    : '批量删除'}
                </button>
              </div>
              <div className='hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600 order-2'></div>
            </>
          )}
          <div className='flex w-full flex-col gap-2 order-1 sm:order-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2'>
            <div className='w-full overflow-x-auto sm:w-auto'>
              <div className='ml-auto flex w-max items-center gap-2 whitespace-nowrap'>

                <button
                  onClick={openWeightModal}
                  className={`${buttonStyles.secondary} flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
                  title='拖动排序并批量生成推荐权重'
                >
                  <Settings size={14} />
                  <span>权重设置</span>
                </button>
                <button
                  onClick={openClientAdSourcesModal}
                  className={`${buttonStyles.secondary} flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
                  title='选择在手机/电视客户端播放时自动去广告的视频源'
                >
                  <Settings size={14} />
                  <span>客户端广告配置</span>
                  {(config?.ClientAdSourceApis?.length || 0) > 0 && (
                    <span className='rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'>
                      {config?.ClientAdSourceApis?.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className='w-full overflow-x-auto sm:w-auto'>
              <div className='ml-auto flex w-max items-center gap-2 whitespace-nowrap'>
                <button
                  onClick={() => setShowValidationModal(true)}
                  disabled={isValidating}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors flex shrink-0 items-center space-x-1 whitespace-nowrap ${
                    isValidating ? buttonStyles.disabled : buttonStyles.primary
                  }`}
                >
                  {isValidating ? (
                    <>
                      <div className='w-3 h-3 border border-white border-t-transparent rounded-full animate-spin'></div>
                      <span>检测中...</span>
                    </>
                  ) : (
                    '有效性检测'
                  )}
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`${
                    showAddForm ? buttonStyles.secondary : buttonStyles.success
                  } shrink-0 whitespace-nowrap`}
                >
                  {showAddForm ? '取消' : '添加视频源'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='名称'
              value={newSource.name}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='Key'
              value={newSource.key}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, key: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='API 地址'
              value={newSource.api}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, api: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='Detail 地址（选填）'
              value={newSource.detail}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, detail: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleAddSource}
              disabled={
                !newSource.name ||
                !newSource.key ||
                !newSource.api ||
                isLoading('addSource')
              }
              className={`w-full sm:w-auto px-4 py-2 ${
                !newSource.name ||
                !newSource.key ||
                !newSource.api ||
                isLoading('addSource')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('addSource') ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      )}

      {/* 视频源表格 */}
      <div
        className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto relative'
        data-table='source-list'
      >
        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
          <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
            <tr>
              <th className='w-12 px-2 py-3 text-center'>
                <input
                  type='checkbox'
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                />
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                名称
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                Key
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                API 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                Detail 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                状态
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                代理模式
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                有效性
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
            {sources.map((source) => (
              <SourceRow key={source.key} source={source} />
            ))}
          </tbody>
        </table>
      </div>




      {showClientAdSourcesModal &&
        createPortal(
          <div
            className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
            onClick={closeClientAdSourcesModal}
          >
            <div
              className='flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-700'>
                <div>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    客户端去广告配置
                  </h3>
                  <p className='mt-1 text-sm text-amber-500 dark:text-amber-400'>
                    ⚠️客户端已具备本地去广告功能，该功能可能在未来移除
                  </p>
                </div>
                <button
                  onClick={closeClientAdSourcesModal}
                  className='text-2xl leading-none text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300'
                  aria-label='关闭客户端去广告配置弹窗'
                >
                  ×
                </button>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {config?.SourceConfig?.map((source) => (
                    <label
                      key={source.key}
                      className='flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/50'
                    >
                      <input
                        type='checkbox'
                        checked={clientAdSourceDraftApis.includes(source.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setClientAdSourceDraftApis((prev) =>
                              prev.includes(source.key) ? prev : [...prev, source.key]
                            );
                          } else {
                            setClientAdSourceDraftApis((prev) =>
                              prev.filter((api) => api !== source.key)
                            );
                          }
                        }}
                        className='rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700'
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {source.name}
                        </div>
                        <div className='truncate text-xs text-gray-500 dark:text-gray-400'>
                          {source.key}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/30'>
                <div className='flex flex-wrap gap-2'>
                  <button
                    onClick={() => setClientAdSourceDraftApis([])}
                    className={buttonStyles.quickAction}
                  >
                    全不选
                  </button>
                  <button
                    onClick={() => {
                      const allApis =
                        config?.SourceConfig?.filter((source) => !source.disabled).map(
                          (source) => source.key
                        ) || [];
                      setClientAdSourceDraftApis(allApis);
                    }}
                    className={buttonStyles.quickAction}
                  >
                    全选启用源
                  </button>
                </div>
                <div className='flex items-center gap-3'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    已选择：
                    <span className='font-medium text-amber-600 dark:text-amber-400'>
                      {clientAdSourceDraftApis.length} 个源
                    </span>
                  </span>
                  <button onClick={closeClientAdSourcesModal} className={buttonStyles.secondary}>
                    取消
                  </button>
                  <button
                    onClick={handleSaveClientAdSources}
                    disabled={isLoading('saveClientAdSources')}
                    className={`px-4 py-2 ${
                      isLoading('saveClientAdSources')
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading('saveClientAdSources') ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showWeightModal &&
        createPortal(
          <>
            <div
              className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]'
              onClick={handleCloseWeightModal}
              onTouchMove={(e) => {
                e.preventDefault();
              }}
              onWheel={(e) => {
                e.preventDefault();
              }}
              style={{
                touchAction: 'none',
              }}
            />
            <div
              className='fixed left-1/2 top-1/2 z-[10001] flex w-[calc(100%-1rem)] max-w-6xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-700 px-6 py-5'>
                <div>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    视频源权重设置
                  </h3>
                </div>
                <button
                  onClick={handleCloseWeightModal}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-2xl leading-none'
                  aria-label='关闭权重设置弹窗'
                >
                  ×
                </button>
              </div>

              <div
                className='flex-1 min-h-0 overflow-y-auto px-0 overscroll-contain'
                data-panel-content
                data-weight-modal-scroll
                onTouchMove={(e) => {
                  e.stopPropagation();
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                }}
                style={{
                  touchAction: 'pan-y',
                  overscrollBehavior: 'contain',
                }}
              >
                <div className='flex flex-wrap items-center justify-between gap-3 px-6 py-4'>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    排序越靠前，推荐权重越高；拖动后再次生成推荐值时，会把当前列表均匀映射到
                    0~40。
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <button
                      onClick={handleApplyRecommendedWeights}
                      className={buttonStyles.primarySmall}
                    >
                      按当前顺序生成推荐权重
                    </button>
                    <button
                      onClick={handleResetWeightDraft}
                      className={buttonStyles.secondarySmall}
                    >
                      恢复当前配置
                    </button>
                  </div>
                </div>

                <div className='px-6 pb-6'>
                  <div className='overflow-x-auto'>
                    <div className='grid min-w-[820px] grid-cols-[88px_minmax(0,1fr)_112px_112px_220px] gap-3 px-4 pb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                      <div>排序</div>
                      <div>视频源</div>
                      <div>状态</div>
                      <div>推荐值</div>
                      <div>生效权重</div>
                    </div>
                    <div className='min-w-[820px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-3'>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleWeightModalDragEnd}
                        autoScroll={false}
                        modifiers={[
                          restrictToVerticalAxis,
                          restrictToParentElement,
                        ]}
                      >
                        <SortableContext
                          items={weightDraftSources.map((source) => source.key)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className='space-y-3'>
                            {weightDraftSources.map((source, index) => {
                              const recommendedWeight =
                                recommendedWeightMap.get(source.key) ?? 0;
                              return (
                                <WeightModalRow
                                  key={source.key}
                                  source={source}
                                  index={index}
                                  recommendedWeight={recommendedWeight}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4'>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={handleCloseWeightModal}
                    className={buttonStyles.secondary}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveWeightConfig}
                    disabled={
                      !weightModalChanged || isLoading('saveWeightConfig')
                    }
                    className={`px-4 py-2 ${
                      !weightModalChanged || isLoading('saveWeightConfig')
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading('saveWeightConfig') ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* 有效性检测弹窗 */}
      {showValidationModal &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
            onClick={() => setShowValidationModal(false)}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
                视频源有效性检测
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                请输入检测用的搜索关键词
              </p>
              <div className='space-y-4'>
                <input
                  type='text'
                  placeholder='请输入搜索关键词'
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  onKeyPress={(e) =>
                    e.key === 'Enter' && handleValidateSources()
                  }
                />
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => setShowValidationModal(false)}
                    className='px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                  >
                    取消
                  </button>
                  <button
                    onClick={handleValidateSources}
                    disabled={!searchKeyword.trim()}
                    className={`px-4 py-2 ${
                      !searchKeyword.trim()
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    开始检测
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
        onConfirm={alertModal.onConfirm}
      />

      {/* 批量操作确认弹窗 */}
      {confirmModal.isOpen &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-[10020] flex items-center justify-center p-4'
            onClick={confirmModal.onCancel}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {confirmModal.title}
                  </h3>
                  <button
                    onClick={confirmModal.onCancel}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {confirmModal.message}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={confirmModal.onCancel}
                    className={`px-4 py-2 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    disabled={
                      isLoading('batchSource_batch_enable') ||
                      isLoading('batchSource_batch_disable') ||
                      isLoading('batchSource_batch_delete')
                    }
                    className={`px-4 py-2 text-sm font-medium ${
                      isLoading('batchSource_batch_enable') ||
                      isLoading('batchSource_batch_disable') ||
                      isLoading('batchSource_batch_delete')
                        ? buttonStyles.disabled
                        : buttonStyles.success
                    }`}
                  >
                    {isLoading('batchSource_batch_enable') ||
                    isLoading('batchSource_batch_disable') ||
                    isLoading('batchSource_batch_delete')
                      ? '操作中...'
                      : '确认'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// 分类配置组件
const CategoryConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newCategory, setNewCategory] = useState<CustomCategory>({
    name: '',
    type: 'movie',
    query: '',
    disabled: false,
    from: 'config',
  });

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 轻微位移即可触发
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 长按 150ms 后触发，避免与滚动冲突
        tolerance: 5,
      },
    })
  );

  // 初始化
  useEffect(() => {
    if (config?.CustomCategories) {
      setCategories(config.CustomCategories);
      // 进入时重置 orderChanged
      setOrderChanged(false);
    }
  }, [config]);

  // 通用 API 请求
  const callCategoryApi = async (body: Record<string, any>) => {
    try {
      const resp = await fetch('/api/admin/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      // 成功后刷新配置
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
      throw err; // 向上抛出方便调用处判断
    }
  };

  const handleToggleEnable = (query: string, type: 'movie' | 'tv') => {
    const target = categories.find((c) => c.query === query && c.type === type);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    withLoading(`toggleCategory_${query}_${type}`, () =>
      callCategoryApi({ action, query, type })
    ).catch(() => {
      console.error('操作失败', action, query, type);
    });
  };

  const handleDelete = (query: string, type: 'movie' | 'tv') => {
    withLoading(`deleteCategory_${query}_${type}`, () =>
      callCategoryApi({ action: 'delete', query, type })
    ).catch(() => {
      console.error('操作失败', 'delete', query, type);
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.name || !newCategory.query) return;
    withLoading('addCategory', async () => {
      await callCategoryApi({
        action: 'add',
        name: newCategory.name,
        type: newCategory.type,
        query: newCategory.query,
      });
      setNewCategory({
        name: '',
        type: 'movie',
        query: '',
        disabled: false,
        from: 'custom',
      });
      setShowAddForm(false);
    }).catch(() => {
      console.error('操作失败', 'add', newCategory);
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(
      (c) => `${c.query}:${c.type}` === active.id
    );
    const newIndex = categories.findIndex(
      (c) => `${c.query}:${c.type}` === over.id
    );
    setCategories((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = categories.map((c) => `${c.query}:${c.type}`);
    withLoading('saveCategoryOrder', () =>
      callCategoryApi({ action: 'sort', order })
    )
      .then(() => {
        setOrderChanged(false);
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
      });
  };

  // 可拖拽行封装 (dnd-kit)
  const DraggableRow = ({ category }: { category: CustomCategory }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: `${category.query}:${category.type}` });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none'
      >
        <td
          className='px-2 py-4 cursor-grab text-gray-400'
          style={{ touchAction: 'none' }}
          {...{ ...attributes, ...listeners }}
        >
          <GripVertical size={16} />
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {category.name || '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              category.type === 'movie'
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
            }`}
          >
            {category.type === 'movie' ? '电影' : '电视剧'}
          </span>
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[12rem] truncate'
          title={category.query}
        >
          {category.query}
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              !category.disabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}
          >
            {!category.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
          <button
            onClick={() => handleToggleEnable(category.query, category.type)}
            disabled={isLoading(
              `toggleCategory_${category.query}_${category.type}`
            )}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
              !category.disabled
                ? buttonStyles.roundedDanger
                : buttonStyles.roundedSuccess
            } transition-colors ${
              isLoading(`toggleCategory_${category.query}_${category.type}`)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {!category.disabled ? '禁用' : '启用'}
          </button>
          {category.from !== 'config' && (
            <button
              onClick={() => handleDelete(category.query, category.type)}
              disabled={isLoading(
                `deleteCategory_${category.query}_${category.type}`
              )}
              className={`${buttonStyles.roundedSecondary} ${
                isLoading(`deleteCategory_${category.query}_${category.type}`)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              删除
            </button>
          )}
        </td>
      </tr>
    );
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 添加分类表单 */}
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          自定义分类列表
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            showAddForm ? buttonStyles.secondary : buttonStyles.success
          }`}
        >
          {showAddForm ? '取消' : '添加分类'}
        </button>
      </div>

      {showAddForm && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='分类名称'
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <select
              value={newCategory.type}
              onChange={(e) =>
                setNewCategory((prev) => ({
                  ...prev,
                  type: e.target.value as 'movie' | 'tv',
                }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            >
              <option value='movie'>电影</option>
              <option value='tv'>电视剧</option>
            </select>
            <input
              type='text'
              placeholder='搜索关键词'
              value={newCategory.query}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, query: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleAddCategory}
              disabled={
                !newCategory.name ||
                !newCategory.query ||
                isLoading('addCategory')
              }
              className={`w-full sm:w-auto px-4 py-2 ${
                !newCategory.name ||
                !newCategory.query ||
                isLoading('addCategory')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('addCategory') ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      )}

      {/* 分类表格 */}
      <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto relative'>
        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
          <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                分类名称
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                类型
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                搜索关键词
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                状态
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={categories.map((c) => `${c.query}:${c.type}`)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {categories.map((category) => (
                  <DraggableRow
                    key={`${category.query}:${category.type}`}
                    category={category}
                  />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* 保存排序按钮 */}
      {orderChanged && (
        <div className='flex justify-end'>
          <button
            onClick={handleSaveOrder}
            disabled={isLoading('saveCategoryOrder')}
            className={`px-3 py-1.5 text-sm ${
              isLoading('saveCategoryOrder')
                ? buttonStyles.disabled
                : buttonStyles.primary
            }`}
          >
            {isLoading('saveCategoryOrder') ? '保存中...' : '保存排序'}
          </button>
        </div>
      )}

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
        onConfirm={alertModal.onConfirm}
      />
    </div>
  );
};

const VideoSourceScriptLab = () => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [scripts, setScripts] = useState<StandaloneSourceScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [template, setTemplate] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    id?: string;
    key: string;
    name: string;
    description: string;
    code: string;
    enabled: boolean;
    version?: string;
    updatedAt?: number;
  }>({
    key: '',
    name: '',
    description: '',
    code: '',
    enabled: true,
  });
  const [testHook, setTestHook] = useState<
    'getSources' | 'search' | 'recommend' | 'detail' | 'resolvePlayUrl'
  >('getSources');
  const [testPayload, setTestPayload] = useState(JSON.stringify({}, null, 2));
  const [testOutput, setTestOutput] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const applyEditorFromScript = (script: StandaloneSourceScript | null) => {
    if (!script) {
      setEditor({
        key: '',
        name: '',
        description: '',
        code: template,
        enabled: true,
      });
      setSelectedScriptId(null);
      return;
    }

    setEditor({
      id: script.id,
      key: script.key,
      name: script.name,
      description: script.description || '',
      code: script.code,
      enabled: script.enabled,
      version: script.version,
      updatedAt: script.updatedAt,
    });
    setSelectedScriptId(script.id);
  };

  const loadScripts = async (preferId?: string | null) => {
    setLoadingScripts(true);
    try {
      const response = await fetch('/api/admin/source-script', {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || '加载脚本失败');
      }

      const nextScripts = (data.items || []) as StandaloneSourceScript[];
      setScripts(nextScripts);
      setTemplate(data.template || '');

      const targetId =
        preferId !== undefined
          ? preferId
          : selectedScriptId || nextScripts[0]?.id || null;

      const selected = nextScripts.find((item) => item.id === targetId) || null;
      if (selected) {
        applyEditorFromScript(selected);
      } else {
        setEditor({
          key: '',
          name: '',
          description: '',
          code: data.template || '',
          enabled: true,
        });
        setSelectedScriptId(null);
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : '加载脚本失败',
        showAlert
      );
    } finally {
      setLoadingScripts(false);
    }
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const handleCreateNew = () => {
    setSelectedScriptId(null);
    setEditor({
      key: '',
      name: '',
      description: '',
      code: template,
      enabled: true,
    });
    setTestOutput('');
  };

  const handleExportCurrent = () => {
    if (!editor.key || !editor.name || !editor.code) {
      showError('当前没有可导出的脚本', showAlert);
      return;
    }

    const payload = {
      key: editor.key,
      name: editor.name,
      description: editor.description,
      code: editor.code,
      enabled: editor.enabled,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      await withLoading('importSourceScript', async () => {
        const response = await fetch('/api/admin/source-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            items,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || '导入失败');
        }

        showSuccess(`已导入 ${data.items?.length || 0} 个脚本`, showAlert);
        await loadScripts(data.items?.[0]?.id || null);
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : '导入失败', showAlert);
    } finally {
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!editor.key || !editor.name || !editor.code) {
      showError('请填写脚本 Key、名称和代码', showAlert);
      return;
    }

    await withLoading('saveSourceScript', async () => {
      const response = await fetch('/api/admin/source-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          id: editor.id,
          key: editor.key,
          name: editor.name,
          description: editor.description,
          code: editor.code,
          enabled: editor.enabled,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      showSuccess('脚本已保存', showAlert);
      await loadScripts(data.item?.id || editor.id || null);
    }).catch((error) => {
      showError(error instanceof Error ? error.message : '保存失败', showAlert);
    });
  };

  const handleDelete = async () => {
    if (!editor.id) {
      handleCreateNew();
      return;
    }

    showAlert({
      type: 'warning',
      title: '删除脚本',
      message: `确定要删除脚本 "${editor.name}" 吗？`,
      showConfirm: true,
      onConfirm: async () => {
        hideAlert();
        await withLoading('deleteSourceScript', async () => {
          const response = await fetch('/api/admin/source-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              id: editor.id,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || '删除失败');
          }
          showSuccess('脚本已删除', showAlert);
          await loadScripts(null);
        }).catch((error) => {
          showError(
            error instanceof Error ? error.message : '删除失败',
            showAlert
          );
        });
      },
    });
  };

  const handleToggleEnabled = async (id: string) => {
    await withLoading(`toggleSourceScript_${id}`, async () => {
      const response = await fetch('/api/admin/source-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_enabled',
          id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || '更新失败');
      }
      await loadScripts(id);
    }).catch((error) => {
      showError(error instanceof Error ? error.message : '更新失败', showAlert);
    });
  };

  const handleTest = async () => {
    let payload = {};
    try {
      payload = testPayload.trim() ? JSON.parse(testPayload) : {};
    } catch {
      showError('测试输入必须是合法 JSON', showAlert);
      return;
    }

    await withLoading('testSourceScript', async () => {
      const response = await fetch('/api/admin/source-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          key: editor.key || 'test-script',
          name: editor.name || '测试脚本',
          code: editor.code,
          hook: testHook,
          payload,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setTestOutput(JSON.stringify(data, null, 2));
      if (!response.ok) {
        throw new Error(data.error || data.message || '测试失败');
      }
      showSuccess('测试执行完成', showAlert);
    }).catch((error) => {
      showError(error instanceof Error ? error.message : '测试失败', showAlert);
    });
  };

  useEffect(() => {
    setTestPayload(
      testHook === 'getSources'
        ? JSON.stringify({}, null, 2)
        : testHook === 'search'
        ? JSON.stringify(
            { keyword: '凡人修仙传', page: 1, sourceId: 'main' },
            null,
            2
          )
        : testHook === 'recommend'
        ? JSON.stringify({ page: 1 }, null, 2)
        : testHook === 'detail'
        ? JSON.stringify({ id: 'demo-id', sourceId: 'main' }, null, 2)
        : JSON.stringify(
            {
              sourceId: 'main',
              playUrl: 'https://example.com/video.m3u8',
              episodeIndex: 0,
            },
            null,
            2
          )
    );
  }, [testHook]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col lg:flex-row gap-6'>
        <div className='lg:w-80 space-y-4'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              脚本列表
            </h4>
            <div className='flex items-center gap-2'>
              <input
                ref={importInputRef}
                type='file'
                accept='application/json,.json'
                onChange={handleImportFile}
                className='hidden'
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={isLoading('importSourceScript')}
                className={
                  isLoading('importSourceScript')
                    ? buttonStyles.disabledSmall
                    : buttonStyles.primarySmall
                }
              >
                导入
              </button>
              <button
                onClick={() => loadScripts(selectedScriptId)}
                disabled={loadingScripts}
                className={
                  loadingScripts
                    ? buttonStyles.disabledSmall
                    : buttonStyles.secondarySmall
                }
              >
                刷新
              </button>
              <button
                onClick={handleCreateNew}
                className={buttonStyles.successSmall}
              >
                新建
              </button>
            </div>
          </div>

          <div className='space-y-3 max-h-[38rem] overflow-y-auto pr-1'>
            {loadingScripts ? (
              <div className='text-sm text-gray-500 dark:text-gray-400'>
                加载中...
              </div>
            ) : scripts.length === 0 ? (
              <div className='p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400'>
                还没有脚本，点右上角新建一个。
              </div>
            ) : (
              scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => {
                    applyEditorFromScript(script);
                    setTestOutput('');
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedScriptId === script.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                        {script.name}
                      </div>
                      <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {script.key}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        script.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {script.enabled ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className='mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
                    <span>
                      {new Date(script.updatedAt).toLocaleString('zh-CN')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEnabled(script.id);
                      }}
                      disabled={isLoading(`toggleSourceScript_${script.id}`)}
                      className={
                        script.enabled
                          ? buttonStyles.warningSmall
                          : buttonStyles.successSmall
                      }
                    >
                      {script.enabled ? '停用' : '启用'}
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className='flex-1 space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='脚本名称'
              value={editor.name}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='脚本 Key'
              value={editor.key}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, key: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>

          <textarea
            placeholder='脚本描述（可选）'
            value={editor.description}
            onChange={(e) =>
              setEditor((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={2}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          />

          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                脚本代码
              </label>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {editor.version ? `当前版本: ${editor.version}` : '未保存'}
              </div>
            </div>
            <textarea
              value={editor.code}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, code: e.target.value }))
              }
              rows={24}
              spellCheck={false}
              className='w-full px-3 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-950 text-gray-100'
            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <button
              onClick={handleSave}
              disabled={isLoading('saveSourceScript')}
              className={
                isLoading('saveSourceScript')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }
            >
              {isLoading('saveSourceScript') ? '保存中...' : '保存脚本'}
            </button>
            <button
              onClick={handleTest}
              disabled={isLoading('testSourceScript')}
              className={
                isLoading('testSourceScript')
                  ? buttonStyles.disabled
                  : buttonStyles.primary
              }
            >
              {isLoading('testSourceScript') ? '测试中...' : '运行测试'}
            </button>
            <button
              onClick={handleExportCurrent}
              className={buttonStyles.secondary}
            >
              导出当前脚本
            </button>
            <button onClick={handleDelete} className={buttonStyles.danger}>
              {editor.id ? '删除脚本' : '清空编辑器'}
            </button>
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            <div className='space-y-3'>
              <div className='flex items-center gap-3'>
                <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  测试 Hook
                </label>
                <select
                  value={testHook}
                  onChange={(e) =>
                    setTestHook(
                      e.target.value as
                        | 'getSources'
                        | 'search'
                        | 'recommend'
                        | 'detail'
                        | 'resolvePlayUrl'
                    )
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                >
                  <option value='getSources'>getSources</option>
                  <option value='search'>search</option>
                  <option value='recommend'>recommend</option>
                  <option value='detail'>detail</option>
                  <option value='resolvePlayUrl'>resolvePlayUrl</option>
                </select>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                现在脚本可以自己管理多个源，测试入参可传 `sourceId`。
              </p>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={10}
                spellCheck={false}
                className='w-full px-3 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              />
            </div>

            <div className='space-y-3'>
              <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                测试输出
              </div>
              <pre className='w-full min-h-[16rem] whitespace-pre-wrap break-all px-3 py-3 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-950 text-gray-100 overflow-auto'>
                {testOutput || '运行测试后会显示结果、日志和错误信息'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
        onConfirm={alertModal.onConfirm}
      />
    </div>
  );
};

// 新增配置文件组件
const ConfigFileComponent = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [configContent, setConfigContent] = useState('');
  const [subscriptionUrl, setSubscriptionUrl] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  useEffect(() => {
    if (config?.ConfigFile) {
      setConfigContent(config.ConfigFile);
    }
    if (config?.ConfigSubscribtion) {
      setSubscriptionUrl(config.ConfigSubscribtion.URL);
      setAutoUpdate(config.ConfigSubscribtion.AutoUpdate);
      setLastCheckTime(config.ConfigSubscribtion.LastCheck || '');
    }
  }, [config]);

  // 拉取订阅配置
  const handleFetchConfig = async () => {
    if (!subscriptionUrl.trim()) {
      showError('请输入订阅URL', showAlert);
      return;
    }

    await withLoading('fetchConfig', async () => {
      try {
        const resp = await fetch('/api/admin/config_subscription/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: subscriptionUrl }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `拉取失败: ${resp.status}`);
        }

        const data = await resp.json();
        if (data.configContent) {
          setConfigContent(data.configContent);
          // 更新本地配置的最后检查时间
          const currentTime = new Date().toISOString();
          setLastCheckTime(currentTime);
          showSuccess('配置拉取成功', showAlert);
        } else {
          showError('拉取失败：未获取到配置内容', showAlert);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : '拉取失败', showAlert);
        throw err;
      }
    });
  };

  // 处理文件上传
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.json')) {
      showError('请上传JSON格式的文件', showAlert);
      return;
    }

    await withLoading('uploadConfig', async () => {
      try {
        const fileContent = await file.text();

        // 验证JSON格式
        let parsedConfig;
        try {
          parsedConfig = JSON.parse(fileContent);
        } catch (parseError) {
          showError('JSON格式错误，请检查文件内容', showAlert);
          return;
        }

        // 检查是否包含api_site字段
        if (!parsedConfig.api_site) {
          showError('配置文件必须包含api_site字段', showAlert);
          return;
        }

        // 根据api字段进行去重
        const existingConfig = configContent
          ? JSON.parse(configContent)
          : { api_site: {} };
        const existingApis = new Set();

        // 收集现有配置中的所有api
        Object.values(existingConfig.api_site || {}).forEach((site: any) => {
          if (site.api) {
            existingApis.add(site.api);
          }
        });

        // 合并新配置，去重处理
        const mergedApiSite = { ...existingConfig.api_site };
        let duplicateCount = 0;

        Object.entries(parsedConfig.api_site || {}).forEach(
          ([key, site]: [string, any]) => {
            if (site.api && existingApis.has(site.api)) {
              duplicateCount++;
              // 跳过重复的api
              return;
            }
            mergedApiSite[key] = site;
          }
        );

        const mergedConfig = {
          ...parsedConfig,
          api_site: mergedApiSite,
        };

        // 更新配置内容
        setConfigContent(JSON.stringify(mergedConfig, null, 2));

        const message =
          duplicateCount > 0
            ? `配置上传成功，跳过了 ${duplicateCount} 个重复的API`
            : '配置上传成功';
        showSuccess(message, showAlert);
      } catch (err) {
        showError(
          err instanceof Error ? err.message : '文件上传失败',
          showAlert
        );
        throw err;
      }
    });

    // 清空文件输入
    event.target.value = '';
  };

  // 保存配置文件
  const handleSave = async () => {
    await withLoading('saveConfig', async () => {
      try {
        const resp = await fetch('/api/admin/config_file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configFile: configContent,
            subscriptionUrl,
            autoUpdate,
            lastCheckTime: lastCheckTime || new Date().toISOString(),
          }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `保存失败: ${resp.status}`);
        }

        showSuccess('配置文件保存成功', showAlert);
        await refreshConfig();
      } catch (err) {
        showError(err instanceof Error ? err.message : '保存失败', showAlert);
        throw err;
      }
    });
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 配置订阅区域 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
            配置订阅
          </h3>
          <div className='text-sm text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full'>
            最后更新:{' '}
            {lastCheckTime
              ? new Date(lastCheckTime).toLocaleString('zh-CN')
              : '从未更新'}
          </div>
        </div>

        <div className='space-y-6'>
          {/* 订阅URL输入 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              订阅URL
            </label>
            <input
              type='url'
              value={subscriptionUrl}
              onChange={(e) => setSubscriptionUrl(e.target.value)}
              placeholder='https://example.com/config.json'
              disabled={false}
              className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm hover:border-gray-400 dark:hover:border-gray-500'
            />
            <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
              输入配置文件的订阅地址，要求 JSON 格式，且使用 Base58 编码
            </p>
          </div>

          {/* 拉取配置按钮 */}
          <div className='pt-2'>
            <button
              onClick={handleFetchConfig}
              disabled={isLoading('fetchConfig') || !subscriptionUrl.trim()}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isLoading('fetchConfig') || !subscriptionUrl.trim()
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('fetchConfig') ? (
                <div className='flex items-center justify-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  拉取中…
                </div>
              ) : (
                '拉取配置'
              )}
            </button>
          </div>

          {/* 自动更新开关 */}
          <div className='flex items-center justify-between'>
            <div>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                自动更新
              </label>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                启用后系统将定期自动拉取最新配置
              </p>
            </div>
            <button
              type='button'
              onClick={() => setAutoUpdate(!autoUpdate)}
              disabled={false}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                autoUpdate ? buttonStyles.toggleOn : buttonStyles.toggleOff
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full ${
                  buttonStyles.toggleThumb
                } transition-transform ${
                  autoUpdate
                    ? buttonStyles.toggleThumbOn
                    : buttonStyles.toggleThumbOff
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 配置文件编辑区域 */}
      <div className='space-y-4'>
        <div className='relative'>
          <textarea
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            rows={20}
            placeholder='请输入配置文件内容（JSON 格式）...'
            disabled={false}
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500'
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
            spellCheck={false}
            data-gramm={false}
          />
        </div>

        {/* 文件上传区域 */}
        <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
          <div className='flex items-center justify-between mb-3'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              上传JSON配置文件
            </label>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              支持根据API字段自动去重
            </div>
          </div>
          <div className='relative'>
            <input
              type='file'
              accept='.json'
              onChange={handleFileUpload}
              disabled={isLoading('uploadConfig')}
              className='hidden'
              id='json-file-upload'
            />
            <label
              htmlFor='json-file-upload'
              className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-colors ${
                isLoading('uploadConfig')
                  ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className='flex items-center space-x-2'>
                {isLoading('uploadConfig') ? (
                  <>
                    <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      上传中...
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className='w-5 h-5 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                      />
                    </svg>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      点击选择JSON文件或拖拽到此处
                    </span>
                  </>
                )}
              </div>
            </label>
          </div>
          <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
            上传的JSON配置将自动合并到当前配置，重复的API地址将被自动过滤
          </p>
        </div>

        <div className='flex items-center justify-between'>
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            支持 JSON 格式，用于配置视频源和自定义分类
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading('saveConfig')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLoading('saveConfig')
                ? buttonStyles.disabled
                : buttonStyles.success
            }`}
          >
            {isLoading('saveConfig') ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 个性化配置组件


// 音乐配置组件（已停用）
// const MusicConfigComponent = (...) => { ... }

// 新增站点配置组件
const SiteConfigComponent = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();



  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    AnnouncementDisplayMode: 'once',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    DoubanProxyType: 'cmliussss-cdn-tencent',
    DoubanProxy: '',
    DoubanImageProxyType: 'cmliussss-cdn-tencent',
    DoubanImageProxy: '',
    DisableYellowFilter: false,
    FluidSearch: true,




    TMDBApiKey: '',
    TMDBProxy: '',
    TMDBReverseProxy: '',
    TMDBImageBaseUrl: 'https://image.tmdb.org',





    BannerDataSource: 'Douban',
    RecommendationDataSource: 'Mixed',













    LoginRequireTurnstile: false,
    TurnstileSiteKey: '',
    TurnstileSecretKey: '',
    DefaultUserTags: [],














  });

  // 豆瓣数据源相关状态
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);

  // 豆瓣数据源选项
  const doubanDataSourceOptions = [
    { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
    { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  // 豆瓣图片代理选项
  const doubanImageProxyTypeOptions = [
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
    {
      value: 'direct',
      label: '直连（浏览器直接请求豆瓣，可能需要浏览器插件才能正常显示）',
    },
    {
      value: 'img3',
      label: '豆瓣官方精品 CDN（阿里云，可能需要浏览器插件才能正常显示）',
    },
  ];

  // 获取感谢信息
  const getThanksInfo = (dataSource: string) => {
    switch (dataSource) {
      case 'cors-proxy-zwei':
        return {
          text: 'Thanks to @Zwei',
          url: 'https://github.com/bestzwei',
        };
      case 'cmliussss-cdn-tencent':
      case 'cmliussss-cdn-ali':
        return {
          text: 'Thanks to @CMLiussss',
          url: 'https://github.com/cmliu',
        };
      default:
        return null;
    }
  };

  useEffect(() => {

  }, []);

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings({
        ...config.SiteConfig,
        DoubanProxyType:
          config.SiteConfig.DoubanProxyType || 'cmliussss-cdn-tencent',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
        DoubanImageProxyType:
          config.SiteConfig.DoubanImageProxyType || 'cmliussss-cdn-tencent',
        DoubanImageProxy: config.SiteConfig.DoubanImageProxy || '',
        DisableYellowFilter: config.SiteConfig.DisableYellowFilter || false,
        FluidSearch: config.SiteConfig.FluidSearch || true,




        TMDBApiKey: config.SiteConfig.TMDBApiKey || '',
        TMDBProxy: config.SiteConfig.TMDBProxy || '',
        TMDBReverseProxy: config.SiteConfig.TMDBReverseProxy || '',
        TMDBImageBaseUrl:
          config.SiteConfig.TMDBImageBaseUrl || 'https://image.tmdb.org',





        BannerDataSource: config.SiteConfig.BannerDataSource || 'Douban',
        RecommendationDataSource:
          config.SiteConfig.RecommendationDataSource || 'Mixed',











        AnnouncementDisplayMode:
          config.SiteConfig.AnnouncementDisplayMode === 'every'
            ? 'every'
            : 'once',
      });
    }
  }, [config]);

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-datasource"]')) {
          setIsDoubanDropdownOpen(false);
        }
      }
    };

    if (isDoubanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanImageProxyDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-image-proxy"]')) {
          setIsDoubanImageProxyDropdownOpen(false);
        }
      }
    };

    if (isDoubanImageProxyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanImageProxyDropdownOpen]);

  // 处理豆瓣数据源变化
  const handleDoubanDataSourceChange = (value: string) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanProxyType: value,
    }));
  };

  // 处理豆瓣图片代理变化
  const handleDoubanImageProxyChange = (value: string) => {
    setSiteSettings((prev) => ({
      ...prev,
      DoubanImageProxyType: value,
    }));
  };

  // 处理评论开关变化
  const handleCommentsToggle = (checked: boolean) => {
    if (checked) {
      // 如果要开启评论，弹出确认框

    } else {
      // 直接关闭评论
      setSiteSettings((prev) => ({
        ...prev,

      }));
    }
  };

  // 确认开启评论




  // 保存站点配置
  const handleSave = async () => {
    await withLoading('saveSiteConfig', async () => {
      try {
        const resp = await fetch('/api/admin/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...siteSettings }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `保存失败: ${resp.status}`);
        }

        showSuccess('保存成功, 请刷新页面', showAlert);
        await refreshConfig();
      } catch (err) {
        showError(err instanceof Error ? err.message : '保存失败', showAlert);
        throw err;
      }
    });
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 站点名称 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          站点名称
        </label>
        <input
          type='text'
          value={siteSettings.SiteName}
          onChange={(e) =>
            setSiteSettings((prev) => ({ ...prev, SiteName: e.target.value }))
          }
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
        />
      </div>

      {/* 站点公告 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          站点公告
        </label>
        <textarea
          value={siteSettings.Announcement}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              Announcement: e.target.value,
            }))
          }
          rows={3}
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
        />
      </div>

      {/* 公告显示模式 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          公告显示模式
        </label>
        <div className='flex gap-4'>
          <label className='inline-flex items-center gap-2 cursor-pointer'>
            <input
              type='radio'
              name='announcementDisplayMode'
              value='once'
              checked={siteSettings.AnnouncementDisplayMode !== 'every'}
              onChange={() =>
                setSiteSettings((prev) => ({
                  ...prev,
                  AnnouncementDisplayMode: 'once',
                }))
              }
              className='text-green-600 focus:ring-green-500'
            />
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              单次显示
            </span>
          </label>
          <label className='inline-flex items-center gap-2 cursor-pointer'>
            <input
              type='radio'
              name='announcementDisplayMode'
              value='every'
              checked={siteSettings.AnnouncementDisplayMode === 'every'}
              onChange={() =>
                setSiteSettings((prev) => ({
                  ...prev,
                  AnnouncementDisplayMode: 'every',
                }))
              }
              className='text-green-600 focus:ring-green-500'
            />
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              每次显示
            </span>
          </label>
        </div>
      </div>

      {/* 豆瓣数据源设置 */}
      <div className='space-y-3'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            豆瓣数据代理
          </label>
          <div className='relative' data-dropdown='douban-datasource'>
            {/* 自定义下拉选择框 */}
            <button
              type='button'
              onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
              className='w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 text-left'
            >
              {
                doubanDataSourceOptions.find(
                  (option) => option.value === siteSettings.DoubanProxyType
                )?.label
              }
            </button>

            {/* 下拉箭头 */}
            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isDoubanDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* 下拉选项列表 */}
            {isDoubanDropdownOpen && (
              <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto'>
                {doubanDataSourceOptions.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => {
                      handleDoubanDataSourceChange(option.value);
                      setIsDoubanDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      siteSettings.DoubanProxyType === option.value
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className='truncate'>{option.label}</span>
                    {siteSettings.DoubanProxyType === option.value && (
                      <Check className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            选择获取豆瓣数据的方式
          </p>

          {/* 感谢信息 */}
          {getThanksInfo(siteSettings.DoubanProxyType) && (
            <div className='mt-3'>
              <button
                type='button'
                onClick={() =>
                  window.open(
                    getThanksInfo(siteSettings.DoubanProxyType)!.url,
                    '_blank'
                  )
                }
                className='flex items-center justify-center gap-1.5 w-full px-3 text-xs text-gray-500 dark:text-gray-400 cursor-pointer'
              >
                <span className='font-medium'>
                  {getThanksInfo(siteSettings.DoubanProxyType)!.text}
                </span>
                <ExternalLink className='w-3.5 opacity-70' />
              </button>
            </div>
          )}
        </div>

        {/* 豆瓣代理地址设置 - 仅在选择自定义代理时显示 */}
        {siteSettings.DoubanProxyType === 'custom' && (
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              豆瓣代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanProxy: e.target.value,
                }))
              }
              className='w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              自定义代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 豆瓣图片代理设置 */}
      <div className='space-y-3'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            豆瓣图片代理
          </label>
          <div className='relative' data-dropdown='douban-image-proxy'>
            {/* 自定义下拉选择框 */}
            <button
              type='button'
              onClick={() =>
                setIsDoubanImageProxyDropdownOpen(
                  !isDoubanImageProxyDropdownOpen
                )
              }
              className='w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 text-left'
            >
              {
                doubanImageProxyTypeOptions.find(
                  (option) => option.value === siteSettings.DoubanImageProxyType
                )?.label
              }
            </button>

            {/* 下拉箭头 */}
            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isDoubanImageProxyDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* 下拉选项列表 */}
            {isDoubanImageProxyDropdownOpen && (
              <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto'>
                {doubanImageProxyTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => {
                      handleDoubanImageProxyChange(option.value);
                      setIsDoubanImageProxyDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      siteSettings.DoubanImageProxyType === option.value
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className='truncate'>{option.label}</span>
                    {siteSettings.DoubanImageProxyType === option.value && (
                      <Check className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            选择获取豆瓣图片的方式
          </p>

          {/* 感谢信息 */}
          {getThanksInfo(siteSettings.DoubanImageProxyType) && (
            <div className='mt-3'>
              <button
                type='button'
                onClick={() =>
                  window.open(
                    getThanksInfo(siteSettings.DoubanImageProxyType)!.url,
                    '_blank'
                  )
                }
                className='flex items-center justify-center gap-1.5 w-full px-3 text-xs text-gray-500 dark:text-gray-400 cursor-pointer'
              >
                <span className='font-medium'>
                  {getThanksInfo(siteSettings.DoubanImageProxyType)!.text}
                </span>
                <ExternalLink className='w-3.5 opacity-70' />
              </button>
            </div>
          )}
        </div>

        {/* 豆瓣代理地址设置 - 仅在选择自定义代理时显示 */}
        {siteSettings.DoubanImageProxyType === 'custom' && (
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              豆瓣图片代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanImageProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanImageProxy: e.target.value,
                }))
              }
              className='w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              自定义图片代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 搜索接口可拉取最大页数 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          搜索接口可拉取最大页数
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SearchDownstreamMaxPage}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchDownstreamMaxPage: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
        />
      </div>

      {/* 站点接口缓存时间 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          站点接口缓存时间（秒）
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SiteInterfaceCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SiteInterfaceCacheTime: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
        />
      </div>

      {/* 禁用黄色过滤器 */}
      <div>
        <div className='flex items-center justify-between'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            禁用黄色过滤器
          </label>
          <button
            type='button'
            onClick={() =>
              setSiteSettings((prev) => ({
                ...prev,
                DisableYellowFilter: !prev.DisableYellowFilter,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              siteSettings.DisableYellowFilter
                ? buttonStyles.toggleOn
                : buttonStyles.toggleOff
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${
                buttonStyles.toggleThumb
              } transition-transform ${
                siteSettings.DisableYellowFilter
                  ? buttonStyles.toggleThumbOn
                  : buttonStyles.toggleThumbOff
              }`}
            />
          </button>
        </div>
        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
          禁用黄色内容的过滤功能，允许显示所有内容。
        </p>
      </div>

      {/* 流式搜索 */}
      <div>
        <div className='flex items-center justify-between'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            启用流式搜索
          </label>
          <button
            type='button'
            onClick={() =>
              setSiteSettings((prev) => ({
                ...prev,
                FluidSearch: !prev.FluidSearch,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              siteSettings.FluidSearch
                ? buttonStyles.toggleOn
                : buttonStyles.toggleOff
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full ${
                buttonStyles.toggleThumb
              } transition-transform ${
                siteSettings.FluidSearch
                  ? buttonStyles.toggleThumbOn
                  : buttonStyles.toggleThumbOff
              }`}
            />
          </button>
        </div>
        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
          启用后搜索结果将实时流式返回,提升用户体验。
        </p>
      </div>

      {/* 本地设置云同步模式 */}


      <details className='pt-4 border-t border-gray-200 dark:border-gray-700'>
        <summary className='text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer'>
          数据源配置
        </summary>
        <div className='mt-4 space-y-4'>
          {/* 轮播图数据源 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              轮播图数据源
            </label>
            <select
              value={siteSettings.BannerDataSource || 'Douban'}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  BannerDataSource: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            >
              <option value='Douban'>豆瓣</option>
              <option value='TMDB'>TMDB</option>
              <option value='TX'>TX</option>
            </select>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              选择首页轮播图的数据来源
            </p>
          </div>

          {/* 更多推荐数据源 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              更多推荐数据源
            </label>
            <select
              value={siteSettings.RecommendationDataSource || 'Mixed'}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  RecommendationDataSource: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            >
              <option value='Mixed'>混合</option>
              <option value='Douban'>豆瓣</option>
              <option value='TMDB'>TMDB</option>
            </select>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              选择详情页"更多推荐"的数据来源。混合模式会根据豆瓣ID和评论开关自动切换数据源
            </p>
          </div>
        </div>
      </details>

      {/* 弹幕 API 配置 */}


      {/* TMDB 配置 */}
      <details className='pt-4 border-t border-gray-200 dark:border-gray-700'>
        <summary className='text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer'>
          TMDB 配置
        </summary>
        <div className='mt-4 space-y-4'>
          <p className='text-xs text-amber-600 dark:text-amber-400'>
            由于国内网络环境限制，TMDB 服务通常需要配置代理后才能正常使用。
          </p>
          {/* TMDB API Key */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              TMDB API Key
            </label>
            <input
              type='text'
              placeholder='请输入 TMDB API Key（多个key用英文逗号分隔）'
              value={siteSettings.TMDBApiKey}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  TMDBApiKey: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              配置后首页将显示 TMDB 即将上映电影。支持配置多个 API
              Key（用英文逗号分隔）以实现轮询，避免单个 Key 请求限制。获取 API
              Key 请访问{' '}
              <a
                href='https://www.themoviedb.org/settings/api'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
              >
                TMDB API 设置页面
              </a>
            </p>
          </div>

          {/* TMDB Proxy */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              TMDB 系统代理
            </label>
            <input
              type='text'
              placeholder='请输入代理地址（可选）'
              value={siteSettings.TMDBProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  TMDBProxy: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              配置代理服务器地址，用于访问 TMDB API（可选）
            </p>
          </div>

          {/* TMDB Reverse Proxy */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              TMDB 反代代理
            </label>
            <input
              type='text'
              placeholder='请输入反代 Base URL（可选）'
              value={siteSettings.TMDBReverseProxy}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  TMDBReverseProxy: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              配置 TMDB 反向代理 Base URL（可选）
            </p>
          </div>

          {/* TMDB Image Base URL */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              TMDB 图片默认地址
            </label>
            <input
              type='text'
              placeholder='https://image.tmdb.org'
              value={siteSettings.TMDBImageBaseUrl}
              onChange={(e) =>
                setSiteSettings((prev) => ({
                  ...prev,
                  TMDBImageBaseUrl: e.target.value,
                }))
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              用户未在本地数据源设置中配置 TMDB 图片地址时，图片默认使用该地址（默认
              https://image.tmdb.org）
            </p>
          </div>
        </div>
      </details>

      {/* 动漫/Bangumi 配置 */}
      <details className='pt-4 border-t border-gray-200 dark:border-gray-700'>
        <summary className='text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer'>
          动漫数据源配置
        </summary>

      </details>



      {/* Pansou 配置 */}


      {/* 评论功能配置 */}
      <details className='pt-4 border-t border-gray-200 dark:border-gray-700'>
        <summary className='text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer'>
          评论配置
        </summary>
        <div className='mt-4 space-y-4'>
          {/* 开启评论与相似推荐 */}
          <div>
            <div className='flex items-center justify-between'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                开启评论与相似推荐
              </label>

            </div>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              开启后将显示豆瓣评论与相似推荐。评论为逆向抓取，请自行承担责任。
            </p>
          </div>
        </div>
      </details>

      {/* 流量统计配置 */}
      <details className='group rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
        <summary className='flex cursor-pointer items-center justify-between font-medium text-gray-900 dark:text-gray-100'>
          <span className='flex items-center gap-2'>
            <BarChart3 className='h-5 w-5' />
            流量统计
          </span>
          <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
        </summary>
        <div className='mt-4 space-y-4'>
          {/* 启用开关 */}
          <div className='flex items-center justify-between'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                启用流量统计
              </label>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                开启后将在页面中注入统计脚本，支持 Umami、Google Analytics 和自定义代码
              </p>
            </div>
            <button
              type='button'
              onClick={() =>
                setSiteSettings((prev) => ({
                  ...prev,

                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                buttonStyles.toggleOff
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full ${
                  buttonStyles.toggleThumb
                } transition-transform ${
                  buttonStyles.toggleThumbOff
                }`}
              />
            </button>
          </div>


        </div>
      </details>

      {/* 操作按钮 */}
      <div className='flex justify-end'>
        <button
          onClick={handleSave}
          disabled={isLoading('saveSiteConfig')}
          className={`px-4 py-2 ${
            isLoading('saveSiteConfig')
              ? buttonStyles.disabled
              : buttonStyles.success
          } rounded-lg transition-colors`}
        >
          {isLoading('saveSiteConfig') ? '保存中…' : '保存'}
        </button>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />

      {/* 开启评论确认弹窗 */}

    </div>
  );
};

// 注册配置组件


// 自定义去广告配置组件
const CustomAdFilterConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [adFilterCode, setAdFilterCode] = useState('');

  // 默认去广告代码
  const defaultAdFilterCode = `function filterAdsFromM3U8(type: string, m3u8Content: string): string {
  if (!m3u8Content) return '';

  // 广告关键字列表
  const adKeywords = [
    'sponsor',
    '/ad/',
    '/ads/',
    'advert',
    'advertisement',
    '/adjump',
    'redtraffic'
  ];

  // 按行分割M3U8内容
  const lines = m3u8Content.split('\\n');
  const filteredLines = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 跳过 #EXT-X-DISCONTINUITY 标识
    if (line.includes('#EXT-X-DISCONTINUITY')) {
      i++;
      continue;
    }

    // 如果是 EXTINF 行，检查下一行 URL 是否包含广告关键字
    if (line.includes('#EXTINF:')) {
      // 检查下一行 URL 是否包含广告关键字
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const containsAdKeyword = adKeywords.some(keyword =>
          nextLine.toLowerCase().includes(keyword.toLowerCase())
        );

        if (containsAdKeyword) {
          // 跳过 EXTINF 行和 URL 行
          i += 2;
          continue;
        }
      }
    }

    // 保留当前行
    filteredLines.push(line);
    i++;
  }

  return filteredLines.join('\\n');
}`;

  useEffect(() => {
    // 从数据库配置读取自定义去广告代码
    if (config?.SiteConfig?.CustomAdFilterCode) {
      setAdFilterCode(config.SiteConfig.CustomAdFilterCode);
    } else {
      // 如果数据库没有保存的代码，使用默认代码
      setAdFilterCode(defaultAdFilterCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // 移除 TypeScript 类型注解，转换为纯 JavaScript
  const removeTypeAnnotations = (code: string): string => {
    return (
      code
        // 移除函数参数的类型注解：name: type
        .replace(
          /(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*([,)])/g,
          '$1$3'
        )
        // 移除函数返回值类型注解：): type {
        .replace(
          /\)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*\{/g,
          ') {'
        )
        // 移除变量声明的类型注解：const name: type =
        .replace(
          /(const|let|var)\s+(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*=/g,
          '$1 $2 ='
        )
    );
  };

  // 保存自定义去广告代码
  const handleSave = async () => {
    await withLoading('saveAdFilterCode', async () => {
      try {
        // 验证代码语法
        try {
          // 移除类型注解后验证
          const jsCode = removeTypeAnnotations(adFilterCode);
          // 使用 Function 构造器验证代码是否可以解析
          new Function(
            'type',
            'm3u8Content',
            jsCode + '\nreturn filterAdsFromM3U8(type, m3u8Content);'
          );
        } catch (parseError) {
          console.error('代码验证失败:', parseError);
          showError(
            '代码语法错误：' +
              (parseError instanceof Error
                ? parseError.message
                : '请检查代码格式'),
            showAlert
          );
          return;
        }

        // 更新配置到数据库
        if (!config) {
          showError('配置未加载', showAlert);
          return;
        }

        // 准备更新的站点配置，包含自定义去广告代码
        const updatedSiteConfig = {
          ...config.SiteConfig,
          CustomAdFilterCode: adFilterCode,
          CustomAdFilterVersion: Date.now(), // 使用时间戳作为版本号
        };

        const response = await fetch('/api/admin/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSiteConfig),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存配置失败');
        }

        // 刷新配置
        await refreshConfig();

        showSuccess('去广告代码保存成功，刷新后生效', showAlert);
      } catch (err) {
        showError(err instanceof Error ? err.message : '保存失败', showAlert);
        throw err;
      }
    });
  };

  // 重置为默认代码
  const handleReset = () => {
    setAdFilterCode(defaultAdFilterCode);
    showSuccess('已重置为默认代码', showAlert);
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 说明区域 */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
        <div className='flex items-center space-x-2 mb-2'>
          <svg
            className='w-5 h-5 text-blue-600 dark:text-blue-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='text-sm font-medium text-blue-800 dark:text-blue-300'>
            使用说明
          </span>
        </div>
        <div className='text-sm text-blue-700 dark:text-blue-400 space-y-1'>
          <p>• 此功能用于自定义 M3U8 播放列表的去广告逻辑</p>
          <p>• 配置保存到数据库，对全平台所有用户生效</p>
          <p>
            • 客户端会自动缓存代码，只在版本更新时重新获取，不会频繁请求服务器
          </p>
          <p>
            • 函数签名必须为:{' '}
            <code className='bg-blue-100 dark:bg-blue-900/40 px-1 rounded'>
              filterAdsFromM3U8(type, m3u8Content)
            </code>
          </p>
          <p>• type 参数为视频源类型，m3u8Content 为播放列表内容</p>
          <p>• 函数需要返回处理后的 M3U8 内容</p>
          <p>• 支持 TypeScript 类型注解，保存时会自动转换为 JavaScript</p>
        </div>
      </div>

      {/* 代码编辑区域 */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            自定义去广告代码
          </label>
          <button
            onClick={handleReset}
            className={`${buttonStyles.secondarySmall}`}
          >
            重置为默认
          </button>
        </div>
        <div className='relative'>
          <textarea
            value={adFilterCode}
            onChange={(e) => setAdFilterCode(e.target.value)}
            rows={25}
            placeholder='请输入自定义去广告代码...'
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500'
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
            spellCheck={false}
            data-gramm={false}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            修改后需保存才能生效，保存前会进行语法验证
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading('saveAdFilterCode')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLoading('saveAdFilterCode')
                ? buttonStyles.disabled
                : buttonStyles.success
            }`}
          >
            {isLoading('saveAdFilterCode') ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 小雅配置组件








// Telegram Bot 配置组件


// 邮件配置组件


// 求片列表组件


// AI配置组件


// 音乐配置组件


// 直播源配置组件
const LiveSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [liveSources, setLiveSources] = useState<LiveDataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLiveSource, setEditingLiveSource] =
    useState<LiveDataSource | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshIntervalHours, setRefreshIntervalHours] = useState(12);
  const [newLiveSource, setNewLiveSource] = useState<LiveDataSource>({
    name: '',
    key: '',
    url: '',
    ua: '',
    epg: '',
    disabled: false,
    from: 'custom',
  });

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 轻微位移即可触发
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 长按 150ms 后触发，避免与滚动冲突
        tolerance: 5,
      },
    })
  );

  // 初始化
  useEffect(() => {
    if (config?.LiveConfig) {
      setLiveSources(config.LiveConfig);
      setRefreshIntervalHours(config.LiveRefreshIntervalHours || 12);
      // 进入时重置 orderChanged
      setOrderChanged(false);
    }
  }, [config]);

  // 通用 API 请求
  const callLiveSourceApi = async (body: Record<string, any>) => {
    try {
      const resp = await fetch('/api/admin/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      // 成功后刷新配置
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
      throw err; // 向上抛出方便调用处判断
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = liveSources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    withLoading(`toggleLiveSource_${key}`, () =>
      callLiveSourceApi({ action, key })
    ).catch(() => {
      console.error('操作失败', action, key);
    });
  };

  const handleSetProxyMode = (
    key: string,
    mode: 'full' | 'm3u8-only' | 'direct'
  ) => {
    withLoading(`setLiveProxyMode_${key}`, async () => {
      // 保存旧值用于回滚
      const oldMode = liveSources.find((s) => s.key === key)?.proxyMode;

      // 乐观更新本地状态
      setLiveSources((prev) =>
        prev.map((s) => (s.key === key ? { ...s, proxyMode: mode } : s))
      );

      try {
        const response = await fetch('/api/admin/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set_proxy_mode',
            key,
            proxyMode: mode,
          }),
        });

        if (!response.ok) {
          throw new Error('设置代理模式失败');
        }

        // 成功后刷新配置
        await refreshConfig();
      } catch (error) {
        // 失败时回滚本地状态
        setLiveSources((prev) =>
          prev.map((s) => (s.key === key ? { ...s, proxyMode: oldMode } : s))
        );
        showError(
          error instanceof Error ? error.message : '设置代理模式失败',
          showAlert
        );
        throw error;
      }
    }).catch(() => {
      console.error('操作失败', 'set_proxy_mode', key);
    });
  };

  const handleDelete = (key: string) => {
    withLoading(`deleteLiveSource_${key}`, () =>
      callLiveSourceApi({ action: 'delete', key })
    ).catch(() => {
      console.error('操作失败', 'delete', key);
    });
  };

  // 刷新直播源
  const handleSaveRefreshInterval = () => {
    withLoading('saveLiveRefreshInterval', async () => {
      if (!config) return;

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          LiveRefreshIntervalHours: Math.max(1, refreshIntervalHours || 12),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `保存失败: ${response.status}`);
      }

      await refreshConfig();
      showAlert({
        type: 'success',
        title: '保存成功',
        message: '电视直播刷新间隔已保存',
        timer: 2000,
      });
    }).catch((err) => {
      showError(err instanceof Error ? err.message : '保存失败', showAlert);
    });
  };

  const handleRefreshLiveSources = async () => {
    if (isRefreshing) return;

    await withLoading('refreshLiveSources', async () => {
      setIsRefreshing(true);
      try {
        const response = await fetch('/api/admin/live/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `刷新失败: ${response.status}`);
        }

        // 刷新成功后重新获取配置
        await refreshConfig();
        showAlert({
          type: 'success',
          title: '刷新成功',
          message: '直播源已刷新',
          timer: 2000,
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : '刷新失败', showAlert);
        throw err;
      } finally {
        setIsRefreshing(false);
      }
    });
  };

  const handleAddLiveSource = () => {
    if (!newLiveSource.name || !newLiveSource.key || !newLiveSource.url) return;
    withLoading('addLiveSource', async () => {
      await callLiveSourceApi({
        action: 'add',
        key: newLiveSource.key,
        name: newLiveSource.name,
        url: newLiveSource.url,
        ua: newLiveSource.ua,
        epg: newLiveSource.epg,
      });
      setNewLiveSource({
        name: '',
        key: '',
        url: '',
        epg: '',
        ua: '',
        disabled: false,
        from: 'custom',
      });
      setShowAddForm(false);
    }).catch(() => {
      console.error('操作失败', 'add', newLiveSource);
    });
  };

  const handleEditLiveSource = () => {
    if (!editingLiveSource || !editingLiveSource.name || !editingLiveSource.url)
      return;
    withLoading('editLiveSource', async () => {
      await callLiveSourceApi({
        action: 'edit',
        key: editingLiveSource.key,
        name: editingLiveSource.name,
        url: editingLiveSource.url,
        ua: editingLiveSource.ua,
        epg: editingLiveSource.epg,
      });
      setEditingLiveSource(null);
    }).catch(() => {
      console.error('操作失败', 'edit', editingLiveSource);
    });
  };

  const handleCancelEdit = () => {
    setEditingLiveSource(null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = liveSources.findIndex((s) => s.key === active.id);
    const newIndex = liveSources.findIndex((s) => s.key === over.id);
    setLiveSources((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = liveSources.map((s) => s.key);
    withLoading('saveLiveSourceOrder', () =>
      callLiveSourceApi({ action: 'sort', order })
    )
      .then(() => {
        setOrderChanged(false);
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
      });
  };

  // 可拖拽行封装 (dnd-kit)
  const DraggableRow = ({ liveSource }: { liveSource: LiveDataSource }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: liveSource.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none'
      >
        <td
          className='px-2 py-4 cursor-grab text-gray-400'
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {liveSource.name}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {liveSource.key}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[12rem] truncate'
          title={liveSource.url}
        >
          {liveSource.url}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[8rem] truncate'
          title={liveSource.epg || '-'}
        >
          {liveSource.epg || '-'}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[8rem] truncate'
          title={liveSource.ua || '-'}
        >
          {liveSource.ua || '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-center'>
          {liveSource.channelNumber && liveSource.channelNumber > 0
            ? liveSource.channelNumber
            : '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              !liveSource.disabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}
          >
            {!liveSource.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className='px-6 py-4 whitespace-nowrap'>
          <select
            value={liveSource.proxyMode || 'full'}
            onChange={(e) => {
              handleSetProxyMode(
                liveSource.key,
                e.target.value as 'full' | 'm3u8-only' | 'direct'
              );
            }}
            disabled={isLoading(`setLiveProxyMode_${liveSource.key}`)}
            className={`px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
              isLoading(`setLiveProxyMode_${liveSource.key}`)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <option value='full'>全量代理</option>
            <option value='m3u8-only'>仅代理m3u8</option>
            <option value='direct'>直连</option>
          </select>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
          <button
            onClick={() => handleToggleEnable(liveSource.key)}
            disabled={isLoading(`toggleLiveSource_${liveSource.key}`)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
              !liveSource.disabled
                ? buttonStyles.roundedDanger
                : buttonStyles.roundedSuccess
            } transition-colors ${
              isLoading(`toggleLiveSource_${liveSource.key}`)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {!liveSource.disabled ? '禁用' : '启用'}
          </button>
          {liveSource.from !== 'config' && (
            <>
              <button
                onClick={() => setEditingLiveSource(liveSource)}
                disabled={isLoading(`editLiveSource_${liveSource.key}`)}
                className={`${buttonStyles.roundedPrimary} ${
                  isLoading(`editLiveSource_${liveSource.key}`)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(liveSource.key)}
                disabled={isLoading(`deleteLiveSource_${liveSource.key}`)}
                className={`${buttonStyles.roundedSecondary} ${
                  isLoading(`deleteLiveSource_${liveSource.key}`)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                删除
              </button>
            </>
          )}
        </td>
      </tr>
    );
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 添加直播源表单 */}
      <div className='space-y-4'>
        <div className='flex items-end justify-between gap-3'>
          <div className='flex items-end gap-2 flex-nowrap'>
            <div className='min-w-0'>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 whitespace-nowrap'>
                刷新间隔（小时）
              </label>
              <input
                type='number'
                min='1'
                value={refreshIntervalHours}
                onChange={(e) =>
                  setRefreshIntervalHours(
                    Math.max(1, parseInt(e.target.value) || 12)
                  )
                }
                className='px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-28 sm:w-40'
              />
            </div>
            <button
              onClick={handleSaveRefreshInterval}
              disabled={isLoading('saveLiveRefreshInterval')}
              className={`px-3 py-1.5 text-sm whitespace-nowrap shrink-0 ${
                isLoading('saveLiveRefreshInterval')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('saveLiveRefreshInterval') ? '保存中...' : '保存间隔'}
            </button>
          </div>
        </div>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            直播源列表
          </h4>
          <div className='flex items-center space-x-2'>
            <button
              onClick={handleRefreshLiveSources}
              disabled={isRefreshing || isLoading('refreshLiveSources')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center space-x-2 ${
                isRefreshing || isLoading('refreshLiveSources')
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-lg'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
              }`}
            >
              <span>
                {isRefreshing || isLoading('refreshLiveSources')
                  ? '刷新中...'
                  : '刷新直播源'}
              </span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`${
                showAddForm ? buttonStyles.secondary : buttonStyles.success
              } shrink-0 whitespace-nowrap`}
            >
              {showAddForm ? '取消' : '添加直播源'}
            </button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='名称'
              value={newLiveSource.name}
              onChange={(e) =>
                setNewLiveSource((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='Key'
              value={newLiveSource.key}
              onChange={(e) =>
                setNewLiveSource((prev) => ({ ...prev, key: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='M3U 地址'
              value={newLiveSource.url}
              onChange={(e) =>
                setNewLiveSource((prev) => ({ ...prev, url: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='节目单地址（选填）'
              value={newLiveSource.epg}
              onChange={(e) =>
                setNewLiveSource((prev) => ({ ...prev, epg: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='自定义 UA（选填）'
              value={newLiveSource.ua}
              onChange={(e) =>
                setNewLiveSource((prev) => ({ ...prev, ua: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleAddLiveSource}
              disabled={
                !newLiveSource.name ||
                !newLiveSource.key ||
                !newLiveSource.url ||
                isLoading('addLiveSource')
              }
              className={`w-full sm:w-auto px-4 py-2 ${
                !newLiveSource.name ||
                !newLiveSource.key ||
                !newLiveSource.url ||
                isLoading('addLiveSource')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('addLiveSource') ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      )}

      {/* 编辑直播源表单 */}
      {editingLiveSource && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4'>
          <div className='flex items-center justify-between'>
            <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              编辑直播源: {editingLiveSource.name}
            </h5>
            <button
              onClick={handleCancelEdit}
              className='text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            >
              ✕
            </button>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                名称
              </label>
              <input
                type='text'
                value={editingLiveSource.name}
                onChange={(e) =>
                  setEditingLiveSource((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Key (不可编辑)
              </label>
              <input
                type='text'
                value={editingLiveSource.key}
                disabled
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                M3U 地址
              </label>
              <input
                type='text'
                value={editingLiveSource.url}
                onChange={(e) =>
                  setEditingLiveSource((prev) =>
                    prev ? { ...prev, url: e.target.value } : null
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                节目单地址（选填）
              </label>
              <input
                type='text'
                value={editingLiveSource.epg}
                onChange={(e) =>
                  setEditingLiveSource((prev) =>
                    prev ? { ...prev, epg: e.target.value } : null
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                自定义 UA（选填）
              </label>
              <input
                type='text'
                value={editingLiveSource.ua}
                onChange={(e) =>
                  setEditingLiveSource((prev) =>
                    prev ? { ...prev, ua: e.target.value } : null
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              />
            </div>
          </div>
          <div className='flex justify-end space-x-2'>
            <button
              onClick={handleCancelEdit}
              className={buttonStyles.secondary}
            >
              取消
            </button>
            <button
              onClick={handleEditLiveSource}
              disabled={
                !editingLiveSource.name ||
                !editingLiveSource.url ||
                isLoading('editLiveSource')
              }
              className={`${
                !editingLiveSource.name ||
                !editingLiveSource.url ||
                isLoading('editLiveSource')
                  ? buttonStyles.disabled
                  : buttonStyles.success
              }`}
            >
              {isLoading('editLiveSource') ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* 直播源表格 */}
      <div
        className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto relative'
        data-table='live-source-list'
      >
        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
          <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
            <tr>
              <th
                className='px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                aria-label='排序'
              />
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                名称
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                Key
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                M3U 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                节目单地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                自定义 UA
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                频道数
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                状态
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                代理模式
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={liveSources.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {liveSources.map((liveSource) => (
                  <DraggableRow key={liveSource.key} liveSource={liveSource} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* 保存排序按钮 */}
      {orderChanged && (
        <div className='flex justify-end'>
          <button
            onClick={handleSaveOrder}
            disabled={isLoading('saveLiveSourceOrder')}
            className={`px-3 py-1.5 text-sm ${
              isLoading('saveLiveSourceOrder')
                ? buttonStyles.disabled
                : buttonStyles.primary
            }`}
          >
            {isLoading('saveLiveSourceOrder') ? '保存中...' : '保存排序'}
          </button>
        </div>
      )}

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 网络直播配置组件


function AdminPageClient() {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [showResetConfigModal, setShowResetConfigModal] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState<{ [key: string]: boolean }>({
    userConfig: false,
    videoSource: false,
    sourceScriptLab: false,

    mediaLibrary: false,








    liveSource: false,
    webLive: false,
    siteConfig: false,

    categoryConfig: false,
    configFile: false,
    dataMigration: false,
    customAdFilter: false,

    emailConfig: false,

  });

  // PC 左右布局：当前选中的区块（单选），持久化以便保存刷新后仍停留在原区块
  const [activeKey, setActiveKey] = useState<string>(() => {
    if (typeof window === 'undefined') return 'siteConfig';
    return localStorage.getItem('admin_active_section') || 'siteConfig';
  });
  // PC 内容区滚动容器，切换区块时回到顶部
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  // PC 侧边栏中分组的展开状态
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({ mediaLibrary: true });

  // 获取管理员配置
  // showLoading 用于控制是否在请求期间显示整体加载骨架。
  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`/api/admin/config`);

      if (!response.ok) {
        const data = (await response.json()) as any;
        throw new Error(`获取配置失败: ${data.error}`);
      }

      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
      setRole(data.Role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      // 只在首次加载时设置错误状态，避免弹窗和错误页面同时显示
      if (showLoading) {
        setError(msg);
      } else {
        showError(msg, showAlert);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // 新版本用户列表状态
  const [usersV2, setUsersV2] = useState<Array<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    banned: boolean;
    tags?: string[];
    enabledApis?: string[];
    created_at: number;
  }> | null>(null);

  // 用户列表分页状态
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const userLimit = 10;

  // 获取新版本用户列表
  const fetchUsersV2 = useCallback(
    async (page = 1, search = userSearch) => {
      try {
        setUserListLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(userLimit),
        });
        const trimmedSearch = search.trim();
        if (trimmedSearch) {
          params.set('search', trimmedSearch);
        }
        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setUsersV2(data.users);
          setUserTotalPages(data.totalPages || 1);
          setUserTotal(data.total || 0);
          setUserPage(page);
        }
      } catch (err) {
        console.error('获取新版本用户列表失败:', err);
      } finally {
        setUserListLoading(false);
      }
    },
    [userSearch]
  );

  // 刷新配置和用户列表
  const refreshConfigAndUsers = useCallback(async () => {
    await fetchConfig();
    await fetchUsersV2(userPage); // 保持当前页码
  }, [fetchConfig, fetchUsersV2, userPage]);

  useEffect(() => {
    // 首次加载时显示骨架
    fetchConfig(true);
    // 若恢复的区块是用户管理，则补拉一次用户列表
    if (activeKey === 'userConfig') {
      fetchUsersV2();
    }
    // 仅在挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchConfig]);

  // PC 切换区块时，内容区滚动回顶部
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [activeKey]);

  // 切换标签展开状态
  const toggleTab = (tabKey: string) => {
    const wasExpanded = expandedTabs[tabKey];

    setExpandedTabs((prev) => ({
      ...prev,
      [tabKey]: !prev[tabKey],
    }));

    // 当打开用户管理选项卡时，如果还没有加载用户列表，则加载
    if (tabKey === 'userConfig' && !wasExpanded && !usersV2) {
      fetchUsersV2();
    }
  };

  // PC 左右布局：选中某个区块
  const selectSection = (key: string) => {
    setActiveKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_active_section', key);
    }
    // 首次进入用户管理时懒加载用户列表
    if (key === 'userConfig' && !usersV2) {
      fetchUsersV2();
    }
  };

  // PC 侧边栏：切换分组展开
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 新增: 重置配置处理函数
  const handleResetConfig = () => {
    setShowResetConfigModal(true);
  };

  const handleConfirmResetConfig = async () => {
    await withLoading('resetConfig', async () => {
      try {
        const response = await fetch(`/api/admin/reset`);
        if (!response.ok) {
          throw new Error(`重置失败: ${response.status}`);
        }
        showSuccess('重置成功，请刷新页面！', showAlert);
        await fetchConfig();
        setShowResetConfigModal(false);
      } catch (err) {
        showError(err instanceof Error ? err.message : '重置失败', showAlert);
        throw err;
      }
    });
  };

  // 新增: 重载配置处理函数
  const handleReloadConfig = async () => {
    await withLoading('reloadConfig', async () => {
      try {
        const response = await fetch(`/api/admin/reload`);
        if (!response.ok) {
          throw new Error(`重载失败: ${response.status}`);
        }
        showSuccess('重载成功，配置缓存已清除！', showAlert);
        await fetchConfig();
      } catch (err) {
        showError(err instanceof Error ? err.message : '重载失败', showAlert);
        throw err;
      }
    });
  };

  if (loading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='px-2 sm:px-10 py-4 sm:py-8'>
          <div className='max-w-[95%] mx-auto'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8'>
              管理员设置
            </h1>
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className='h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse'
                />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    // 显示无权限提示页面
    return (
      <PageLayout activePath='/admin'>
        <div className='min-h-screen flex items-center justify-center px-4'>
          <div className='max-w-md w-full'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center'>
              <div className='mb-6'>
                <div className='mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center'>
                  <AlertCircle className='w-8 h-8 text-red-600 dark:text-red-400' />
                </div>
              </div>
              <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
                无权限访问
              </h2>
              <p className='text-gray-600 dark:text-gray-400 mb-6'>{error}</p>
              <div className='space-y-3'>
                <button
                  onClick={() => (window.location.href = '/')}
                  className='w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors'
                >
                  返回首页
                </button>
                <button
                  onClick={() => (window.location.href = '/login')}
                  className='w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg font-medium transition-colors'
                >
                  重新登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 管理面板区块导航配置（PC 侧边栏与移动端手风琴共用同一份数据）
  type AdminNavItem = {
    key: string;
    title: string;
    icon: React.ReactNode;
    ownerOnly?: boolean;
    render?: () => React.ReactNode;
    children?: AdminNavItem[];
  };

  const navIconClass = 'text-gray-600 dark:text-gray-400';
  const navItems: AdminNavItem[] = [
    {
      key: 'configFile',
      title: '配置文件',
      ownerOnly: true,
      icon: <FileText size={20} className={navIconClass} />,
      render: () => (
        <ConfigFileComponent config={config} refreshConfig={fetchConfig} />
      ),
    },
    {
      key: 'siteConfig',
      title: '站点配置',
      icon: <Settings size={20} className={navIconClass} />,
      render: () => (
        <SiteConfigComponent config={config} refreshConfig={fetchConfig} />
      ),
    },


    {
      key: 'userConfig',
      title: '用户管理',
      icon: <Users size={20} className={navIconClass} />,
      render: () => (
        <UserConfig
          config={config}
          role={role}
          refreshConfig={refreshConfigAndUsers}
          usersV2={usersV2}
          userPage={userPage}
          userTotalPages={userTotalPages}
          userTotal={userTotal}
          fetchUsersV2={fetchUsersV2}
          userListLoading={userListLoading}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
        />
      ),
    },
    {
      key: 'videoSource',
      title: '视频源配置',
      icon: <Video size={20} className={navIconClass} />,
      render: () => (
        <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
      ),
    },
    {
      key: 'sourceScriptLab',
      title: '视频源脚本',
      icon: <Bot size={20} className={navIconClass} />,
      render: () => <VideoSourceScriptLab />,
    },



    {
      key: 'liveSource',
      title: '电视直播源配置',
      icon: <Tv size={20} className={navIconClass} />,
      render: () => (
        <LiveSourceConfig config={config} refreshConfig={fetchConfig} />
      ),
    },





    {
      key: 'categoryConfig',
      title: '分类配置',
      icon: <FolderOpen size={20} className={navIconClass} />,
      render: () => (
        <CategoryConfig config={config} refreshConfig={fetchConfig} />
      ),
    },
    {
      key: 'customAdFilter',
      title: '自定义去广告',
      icon: (
        <svg
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className={navIconClass}
        >
          <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' />
          <path d='M8 12h8' />
        </svg>
      ),
      render: () => (
        <CustomAdFilterConfig config={config} refreshConfig={fetchConfig} />
      ),
    },
    {
      key: 'dataMigration',
      title: '数据迁移',
      ownerOnly: true,
      icon: <Database size={20} className={navIconClass} />,
      render: () => <DataMigration onRefreshConfig={refreshConfigAndUsers} />,
    },
  ];

  // 根据 key 查找区块（含分组子项）
  const findNavItem = (key: string): AdminNavItem | undefined => {
    for (const it of navItems) {
      if (it.key === key) return it;
      const child = it.children?.find((c) => c.key === key);
      if (child) return child;
    }
    return undefined;
  };

  const visibleNavItems = navItems.filter(
    (it) => !it.ownerOnly || role === 'owner'
  );
  const activeItem = findNavItem(activeKey);

  return (
    <PageLayout activePath='/admin'>
      <div className='px-2 sm:px-10 py-4 sm:py-8'>
        <div className='max-w-[95%] mx-auto'>
          {/* 标题 + 重置配置按钮 */}
          <div className='flex items-center gap-2 mb-8'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              管理员设置
            </h1>
            {config && role === 'owner' && (
              <>
                <button
                  onClick={handleResetConfig}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${buttonStyles.dangerSmall}`}
                >
                  重置配置
                </button>
                <button
                  onClick={handleReloadConfig}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${buttonStyles.primarySmall}`}
                >
                  重载配置
                </button>
              </>
            )}
          </div>

          {/* TMDB 未配置提示 */}
          {config && !config.SiteConfig.TMDBApiKey && (
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 mt-0.5'>
                  <svg
                    className='w-5 h-5 text-blue-600 dark:text-blue-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                    未配置 TMDB API Key，配置后可获得更丰富的影视信息和推荐内容
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 视频源过多提示 */}
          {config && (config.SourceConfig?.length ?? 0) > 50 && (
            <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0 mt-0.5'>
                  <svg
                    className='w-5 h-5 text-amber-600 dark:text-amber-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.591c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.743-2.99L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-amber-800 dark:text-amber-300'>
                    当前视频源数量较多，可能会拖慢搜索与优选速度，建议适当精简
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PC：左右结构（侧边栏 + 内容区），两栏各自独立滚动 */}
          <div className='hidden lg:flex gap-6 lg:h-[calc(100vh-7rem)]'>
            {/* 侧边栏 */}
            <nav className='w-56 shrink-0 h-full overflow-y-auto pr-1'>
              <div className='space-y-1'>
                {visibleNavItems.map((item) =>
                  item.children ? (
                    <div key={item.key}>
                      <button
                        onClick={() => toggleGroup(item.key)}
                        className='w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                      >
                        <span className='flex items-center gap-2 min-w-0'>
                          {item.icon}
                          <span className='truncate'>{item.title}</span>
                        </span>
                        {expandedGroups[item.key] ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      {expandedGroups[item.key] && (
                        <div className='mt-1 ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-1'>
                          {item.children.map((child) => (
                            <button
                              key={child.key}
                              onClick={() => selectSection(child.key)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeKey === child.key
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {child.icon}
                              <span className='truncate'>{child.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      key={item.key}
                      onClick={() => selectSection(item.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeKey === item.key
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {item.icon}
                      <span className='truncate'>{item.title}</span>
                    </button>
                  )
                )}
              </div>
            </nav>

            {/* 内容区（独立滚动） */}
            <div
              ref={contentScrollRef}
              className='flex-1 min-w-0 h-full overflow-y-auto pr-1'
            >
              {activeItem?.render?.()}
            </div>
          </div>

          {/* 移动端 / 窄屏：保留原有手风琴 */}
          <div className='lg:hidden'>
          {/* 配置文件标签 - 仅站长可见 */}
          {role === 'owner' && (
            <CollapsibleTab
              title='配置文件'
              icon={
                <FileText
                  size={20}
                  className='text-gray-600 dark:text-gray-400'
                />
              }
              isExpanded={expandedTabs.configFile}
              onToggle={() => toggleTab('configFile')}
            >
              <ConfigFileComponent
                config={config}
                refreshConfig={fetchConfig}
              />
            </CollapsibleTab>
          )}

          {/* 站点配置标签 */}
          <CollapsibleTab
            title='站点配置'
            icon={
              <Settings
                size={20}
                className='text-gray-600 dark:text-gray-400'
              />
            }
            isExpanded={expandedTabs.siteConfig}
            onToggle={() => toggleTab('siteConfig')}
          >
            <SiteConfigComponent config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          {/* 注册配置标签 */}


          {/* 个性化配置标签 */}


          <div className='space-y-4'>
            {/* 用户管理标签 */}
            <CollapsibleTab
              title='用户管理'
              icon={
                <Users size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.userConfig}
              onToggle={() => toggleTab('userConfig')}
            >
              <UserConfig
                config={config}
                role={role}
                refreshConfig={refreshConfigAndUsers}
                usersV2={usersV2}
                userPage={userPage}
                userTotalPages={userTotalPages}
                userTotal={userTotal}
                fetchUsersV2={fetchUsersV2}
                userListLoading={userListLoading}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
              />
            </CollapsibleTab>

            {/* 视频源配置标签 */}
            <CollapsibleTab
              title='视频源配置'
              icon={
                <Video size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.videoSource}
              onToggle={() => toggleTab('videoSource')}
            >
              <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            <CollapsibleTab
              title='视频源脚本'
              icon={
                <Bot size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.sourceScriptLab}
              onToggle={() => toggleTab('sourceScriptLab')}
            >
              <VideoSourceScriptLab />
            </CollapsibleTab>







            {/* 电视直播源配置标签 */}
            <CollapsibleTab
              title='电视直播源配置'
              icon={
                <Tv size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.liveSource}
              onToggle={() => toggleTab('liveSource')}
            >
              <LiveSourceConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            {/* 网络直播配置标签 */}
            <CollapsibleTab
              title='网络直播配置'
              icon={
                <Globe size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.webLive}
              onToggle={() => toggleTab('webLive')}
            >

            </CollapsibleTab>

            {/* 私人影库大类 */}
            <CollapsibleTab
              title='私人影库'
              icon={
                <Database
                  size={20}
                  className='text-yellow-700 dark:text-yellow-400'
                />
              }
              isExpanded={expandedTabs.mediaLibrary}
              onToggle={() => toggleTab('mediaLibrary')}
              isParent={true}
            >
              <div className='space-y-4'>
                {/* Openlist配置子标签 */}


                {/* Emby 媒体库子标签 */}


                {/* 小雅配置子标签 */}

                {/* 求片管理子标签 */}


                {/* 追番订阅子标签 */}



              </div>
            </CollapsibleTab>

            {/* AI配置标签 */}


            {/* 邮件配置标签 */}
            <CollapsibleTab
              title='邮件配置'
              icon={
                <Mail size={20} className='text-gray-600 dark:text-gray-400' />
              }
              isExpanded={expandedTabs.emailConfig}
              onToggle={() => toggleTab('emailConfig')}
            >

            </CollapsibleTab>

            {/* Telegram Bot 配置标签 */}


            {/* 分类配置标签 */}
            <CollapsibleTab
              title='分类配置'
              icon={
                <FolderOpen
                  size={20}
                  className='text-gray-600 dark:text-gray-400'
                />
              }
              isExpanded={expandedTabs.categoryConfig}
              onToggle={() => toggleTab('categoryConfig')}
            >
              <CategoryConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>

            {/* 自定义去广告标签 */}
            <CollapsibleTab
              title='自定义去广告'
              icon={
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='text-gray-600 dark:text-gray-400'
                >
                  <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' />
                  <path d='M8 12h8' />
                </svg>
              }
              isExpanded={expandedTabs.customAdFilter}
              onToggle={() => toggleTab('customAdFilter')}
            >
              <CustomAdFilterConfig
                config={config}
                refreshConfig={fetchConfig}
              />
            </CollapsibleTab>

            {/* 数据迁移标签 - 仅站长可见 */}
            {role === 'owner' && (
              <CollapsibleTab
                title='数据迁移'
                icon={
                  <Database
                    size={20}
                    className='text-gray-600 dark:text-gray-400'
                  />
                }
                isExpanded={expandedTabs.dataMigration}
                onToggle={() => toggleTab('dataMigration')}
              >
                <DataMigration onRefreshConfig={refreshConfigAndUsers} />
              </CollapsibleTab>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />

      {/* 重置配置确认弹窗 */}
      {showResetConfigModal &&
        createPortal(
          <div
            className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            onClick={() => setShowResetConfigModal(false)}
          >
            <div
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    确认重置配置
                  </h3>
                  <button
                    onClick={() => setShowResetConfigModal(false)}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mb-6'>
                  <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <svg
                        className='w-5 h-5 text-yellow-600 dark:text-yellow-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      <span className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
                        ⚠️ 危险操作警告
                      </span>
                    </div>
                    <p className='text-sm text-yellow-700 dark:text-yellow-400'>
                      此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-end space-x-3'>
                  <button
                    onClick={() => setShowResetConfigModal(false)}
                    className={`px-6 py-2.5 text-sm font-medium ${buttonStyles.secondary}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmResetConfig}
                    disabled={isLoading('resetConfig')}
                    className={`px-6 py-2.5 text-sm font-medium ${
                      isLoading('resetConfig')
                        ? buttonStyles.disabled
                        : buttonStyles.danger
                    }`}
                  >
                    {isLoading('resetConfig') ? '重置中...' : '确认重置'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </PageLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageClient />
    </Suspense>
  );
}
