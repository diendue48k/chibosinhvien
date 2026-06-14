import React, { useState, useEffect, useMemo } from 'react';
import {
  Form, Input, DatePicker, Select, Switch, Button, Card, Table,
  Tag, Space, message, Typography, Modal, Popconfirm,
  Row, Col, Upload, Empty, Spin, Divider, Alert, Tooltip
} from 'antd';
import {
  NotificationOutlined, SendOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, EyeOutlined, UserOutlined, CalendarOutlined,
  TeamOutlined, FilterOutlined, MailOutlined, UploadOutlined,
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined, ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, permissionService } from '../services/permissionService';
import PermissionWrapper from '../components/PermissionWrapper';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../config';
import RichTextEditor from '../components/RichTextEditor';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ── Email Signature (used in HTML generation) ───────────────────────────────
const EMAIL_SIGNATURE_HTML = `
  <table style="border-top:2px solid #c62828;margin-top:24px;padding-top:16px;width:100%;font-size:13px;color:#333;">
    <tr>
      <td style="vertical-align:top;width:60px;padding-right:14px;">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,#c62828,#ad1457);border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;line-height:52px;color:#fff;font-weight:900;font-size:18px;">☭</div>
      </td>
      <td style="vertical-align:top;">
        <div style="font-weight:800;color:#c62828;font-size:14px;">CHI BỘ SINH VIÊN</div>
        <div style="color:#555;font-size:12px;margin-top:2px;">Đảng Bộ Trường Đại Học Kinh Tế – Đại Học Đà Nẵng</div>
        <div style="color:#555;font-size:12px;">📍 71 Ngũ Hành Sơn, Đà Nẵng</div>
        <div style="color:#555;font-size:12px;">✉ chibosvktdn@due.udn.vn</div>
      </td>
    </tr>
  </table>
`;

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

const isValidEmail = (email) => {
  if (!email) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) return false;
  
  const dummyDomains = ['example.com', 'test.com', 'dummy.com', 'none.com', 'abc.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (dummyDomains.includes(domain)) return false;
  
  const username = email.split('@')[0]?.toLowerCase();
  if (['none', 'no-email', 'null', 'placeholder', 'test', 'dummy'].includes(username)) return false;

  return true;
};

const ThongBao = () => {
  const { currentUser } = useAuth();
  const isDangVien = currentUser?.role === ROLES.DANGVIEN;
  const [form] = Form.useForm();

  // Modal states
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // null = tạo mới, object = sửa
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isSendEmailModalVisible, setIsSendEmailModalVisible] = useState(false);
  const [sendEmailTarget, setSendEmailTarget] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailType, setSendEmailType] = useState('both');

  // Data states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [members, setMembers] = useState([]);
  const [detailRecord, setDetailRecord] = useState(null);

  // Filter states
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateRange, setFilterDateRange] = useState(null);

  // Form sub-states
  const [recipientType, setRecipientType] = useState('ca_nhan');
  const [previewImage, setPreviewImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Real-time preview
  const watchedTitle = Form.useWatch('title', form);
  const watchedContent = Form.useWatch('content', form);
  const watchedCreatedBy = Form.useWatch('created_by', form);
  const watchedDeadline = Form.useWatch('deadline', form);
  const watchedImageUrl = Form.useWatch('image_url', form);
  const watchedSenderEmail = Form.useWatch('sender_email', form);
  const watchedSenderPhone = Form.useWatch('sender_phone', form);
  const watchedSendEmail = Form.useWatch('send_email', form);

  // Rich text content state (HTML)
  const [richContent, setRichContent] = useState('');

  // ── Email HTML Generator ──────────────────────────────────────────────────
  const generateEmailHtml = (title, content, imageUrl, createdBy, deadline, senderEmail, senderPhone, attachments = []) => {
    // content is now HTML from RichTextEditor — use directly
    const formattedContent = content || '';
    const sentDate = dayjs().format('HH:mm, DD/MM/YYYY');
    const deadlineStr = deadline ? safeDayjs(deadline).format('HH:mm, DD/MM/YYYY') : null;

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo từ Chi bộ Sinh viên</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.cdnfonts.com/css/svn-gilroy" rel="stylesheet">
    <style>
      body, table, td, p, a, div, h2 {
        font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      }
      @media only screen and (max-width: 600px) {
        body {
          padding: 0 !important;
          background-color: #ffffff !important;
        }
        .email-container {
          width: 100% !important;
          max-width: 100% !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .email-header {
          padding: 20px 15px !important;
        }
        .email-header h2 {
          font-size: 18px !important;
        }
        .email-header p {
          font-size: 11px !important;
        }
        .email-body {
          padding: 20px 15px !important;
        }
        .footer-cell-left {
          display: block !important;
          width: 100% !important;
          padding-right: 0 !important;
          padding-bottom: 20px !important;
          text-align: center !important;
        }
        .footer-cell-left img {
          margin: 0 auto 8px auto !important;
        }
        .footer-cell-divider {
          display: none !important;
        }
        .footer-cell-right {
          display: block !important;
          width: 100% !important;
          padding-left: 0 !important;
          text-align: center !important;
        }
        .footer-cell-right div {
          text-align: center !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f4f6f8;">
    <div class="email-container" style="font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: justify; background-color: #ffffff;">
      
      <!-- Header Banner -->
      <div class="email-header" style="background-color: #b71c1c; background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); padding: 24px; text-align: center; border-bottom: 4px solid #fbc02d;">
        <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">Chi bộ Sinh viên - Đảng bộ Trường Đại học Kinh tế, ĐHĐN</p>
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">THÔNG BÁO</h2>
      </div>
  
      <!-- Content Body -->
      <div class="email-body" style="padding: 30px 24px; line-height: 1.8; color: #333333; font-size: 14px; background-color: #ffffff; text-align: justify; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
        
        <!-- TITLE BAR -->
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #b71c1c; text-transform: uppercase; line-height: 1.4; border-left: 4px solid #b71c1c; padding-left: 12px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
          ${title || '(Chưa có tiêu đề)'}
        </h2>
  
        <!-- META INFO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 12px; color: #555; margin-bottom: 20px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
          <tr>
            <td style="padding: 10px 14px; border-right: 1px solid #e0e0e0; width: 33%;">
              <div style="font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 3px;">Người gửi</div>
              <div style="font-weight: 700; color: #333;">${createdBy || 'Ban Chấp hành Chi bộ'}</div>
            </td>
            <td style="padding: 10px 14px; border-right: 1px solid #e0e0e0; width: 33%;">
              <div style="font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 3px;">Ngày gửi</div>
              <div style="font-weight: 700; color: #333;">${sentDate}</div>
            </td>
            ${deadlineStr ? `
            <td style="padding: 10px 14px; width: 34%;">
              <div style="font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 3px;">⏰ Hạn phản hồi</div>
              <div style="font-weight: 700; color: #b71c1c;">${deadlineStr}</div>
            </td>` : '<td style="padding: 10px 14px; width: 34%;"></td>'}
          </tr>
        </table>
  
        <!-- SALUTATION -->
        <p style="margin: 0 0 14px 0; font-size: 14px; color: #333; line-height: 1.7; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
          <strong>Kính gửi các đồng chí Đảng viên,</strong>
        </p>
  
        <!-- CONTENT -->
        <div style="font-size: 14px; line-height: 1.9; color: #333333; text-align: justify; font-family: 'SVN-Gilroy', 'Inter', sans-serif; margin-bottom: 20px;">
          ${formattedContent || '(Chưa có nội dung)'}
        </div>
  
        ${imageUrl ? `
        <!-- IMAGE -->
        <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; margin-top: 20px;">
          <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; font-weight: 600; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">📎 Hình ảnh đính kèm</p>
          <img src="${imageUrl}" alt="Đính kèm" style="max-width: 100%; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </div>` : ''}

        ${attachments && attachments.length > 0 ? `
        <!-- ATTACHMENTS -->
        <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-top: 20px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
          <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; font-weight: 600;">📎 Tài liệu đính kèm</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #333;">
            ${attachments.map(att => `
              <li style="margin-bottom: 6px;">
                <a href="${att.url}" target="_blank" style="color: #096dd9; text-decoration: underline; font-weight: 600;">
                  ${att.filename}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>` : ''}
  
      </div>
  
      <!-- Brand Signature Footer -->
      <div style="background-color: #ffffff; padding: 24px 20px; border-top: 1.5px solid #e0e0e0; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #333; font-style: italic;">Trân trọng,</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <!-- Left Side: Logo & Name -->
            <td class="footer-cell-left" width="42%" align="center" style="vertical-align: middle; padding-right: 15px;">
              <img src="https://chibosinhvien.vercel.app/logo.png" alt="Logo Chi Bộ Sinh Viên" height="70" style="display: block; margin-bottom: 8px;" />
              <div style="color: #b71c1c; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-family: 'SVN-Gilroy', 'Inter', Arial, sans-serif;">CHI BỘ SINH VIÊN</div>
              <div style="color: #610c0c; font-size: 9px; font-weight: bold; text-transform: uppercase; font-family: 'SVN-Gilroy', 'Inter', Arial, sans-serif;">ĐẢNG BỘ TRƯỜNG ĐẠI HỌC KINH TẾ</div>
            </td>
            
            <!-- Divider Line -->
            <td class="footer-cell-divider" width="3%" align="center" style="vertical-align: middle;">
              <div style="border-left: 1.5px solid #b71c1c; height: 95px; width: 1px;"></div>
            </td>
            
            <!-- Right Side: Contacts -->
            <td class="footer-cell-right" width="55%" style="vertical-align: middle; padding-left: 15px; text-align: left; font-size: 12px; color: #333333; line-height: 1.5;">
              <div style="margin-bottom: 4px;">
                <strong style="color: #b71c1c;">Fanpage:</strong> <a href="https://fb.com/chibosinhvienDUE" target="_blank" style="color: #096dd9; text-decoration: underline;">fb.com/chibosinhvienDUE</a>
              </div>
              <div style="margin-bottom: 4px;">
                <strong style="color: #b71c1c;">Website:</strong> <a href="https://chibosinhvien.vn/" target="_blank" style="color: #096dd9; text-decoration: underline;">chibosinhvien.vn/</a>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #b71c1c;">Email:</strong> <a href="mailto:chibosinhvien@due.edu.vn" style="color: #096dd9; text-decoration: underline;">chibosinhvien@due.edu.vn</a>
              </div>
              <div style="margin-top: 4px; border-top: 1px dashed #e0e0e0; padding-top: 4px;">
                <strong style="color: #b71c1c;">Liên hệ:</strong><br />
                ${createdBy || 'Ban Chấp hành Chi bộ'}<br />
                <a href="mailto:${senderEmail || 'chibosinhvien@due.edu.vn'}" style="color: #096dd9; text-decoration: underline;">${senderEmail || 'chibosinhvien@due.edu.vn'}</a> &nbsp;|&nbsp; <span style="color: #096dd9; text-decoration: underline;">${senderPhone || '0935.743.555'}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
  
      <!-- Automatic Footer -->
      <div style="background:#f5f5f5;padding:12px 28px;border-top:1px solid #e8e8e8;text-align:center;">
        <p style="margin:0;font-size:11px;color:#aaa;">Phát hành tự động bởi Hệ thống Quản lý Chi bộ Sinh viên &copy; 2026</p>
        <p style="margin:4px 0 0;font-size:10px;color:#c0c0c0;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
      </div>
  
    </div>
  </body>
</html>
    `;
  };

  // Live preview
  const livePreviewHtml = generateEmailHtml(
    watchedTitle,
    richContent,  // Use rich HTML content from editor
    watchedImageUrl || previewImage,
    watchedCreatedBy,
    watchedDeadline,
    watchedSenderEmail,
    watchedSenderPhone,
    uploadedFiles
  );


  // ── Image & File Upload ───────────────────────────────────────────────────
  const handleImageUpload = (file) => {
    setImageUploading(true);
    setImageProgress(0);
    const storageRef = ref(storage, `notifications/images/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setImageProgress(percent);
      },
      (error) => {
        message.error('Lỗi khi tải ảnh lên: ' + error.message);
        setImageUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setPreviewImage(downloadURL);
        form.setFieldsValue({ image_url: downloadURL });
        setImageUploading(false);
        message.success('✓ Tải ảnh lên thành công!');
      }
    );
    return false;
  };

  const beforeFileUpload = (file) => {
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Tệp đính kèm phải có dung lượng nhỏ hơn 10MB!');
    }
    return isLt10M;
  };

  const handleCustomFileUpload = ({ file, onSuccess, onError, onProgress }) => {
    const storageRef = ref(storage, `notifications/files/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress({ percent });
      },
      (error) => {
        message.error(`Lỗi khi tải file ${file.name} lên: ${error.message}`);
        onError(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onSuccess({ url: downloadURL }, file);
          message.success(`✓ Tải file ${file.name} thành công!`);
        } catch (err) {
          onError(err);
        }
      }
    );
  };

  const handleFileChange = ({ file, fileList: newFileList }) => {
    setFileList(newFileList);
    if (file.status === 'done') {
      const downloadURL = file.response?.url;
      if (downloadURL) {
        setUploadedFiles(prev => {
          if (prev.some(f => f.uid === file.uid)) return prev;
          return [...prev, {
            uid: file.uid,
            filename: file.name,
            url: downloadURL,
            size: file.size
          }];
        });
      }
    } else if (file.status === 'removed' || !file.status) {
      setUploadedFiles(prev => prev.filter(f => f.uid !== file.uid));
    }
  };

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    try {
      const snap = await getDocs(collection(db, 'dang_vien'));
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(dv => !dv.trang_thai || dv.trang_thai === 'dang_sinh_hoat'));
    } catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => safeDayjs(b.created_at).valueOf() - safeDayjs(a.created_at).valueOf());
      setNotifications(list);
    } catch (e) { message.error('Lỗi khi tải thông báo'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); fetchNotifications(); }, []);

  // ── Derived filter options ────────────────────────────────────────────────
  const uniqueFaculties = useMemo(() => [...new Set(members.map(m => m.khoa).filter(Boolean))].sort(), [members]);
  const uniqueBatches = useMemo(() => {
    const b = members.map(m => {
      if (m.lop) { const x = m.lop.match(/^(\d{2}[Kk])/); return x ? x[1].toUpperCase() : m.lop.substring(0, 3).toUpperCase(); }
      return m.mssv ? m.mssv.substring(0, 2) + 'K' : null;
    }).filter(Boolean);
    return [...new Set(b)].sort();
  }, [members]);
  const uniqueGroups = useMemo(() => [...new Set(members.map(m => m.nhom).filter(Boolean))].sort(), [members]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const kw = filterKeyword.toLowerCase();
      const matchKeyword = !kw || n.title?.toLowerCase().includes(kw) || n.created_by?.toLowerCase().includes(kw);
      const matchType = !filterType || n.recipient_type === filterType;

      let matchDate = true;
      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        const start = filterDateRange[0].startOf('day').valueOf();
        const end = filterDateRange[1].endOf('day').valueOf();
        const createdAtVal = safeDayjs(n.created_at).valueOf();
        matchDate = createdAtVal >= start && createdAtVal <= end;
      }

      return matchKeyword && matchType && matchDate;
    });
  }, [notifications, filterKeyword, filterType, filterDateRange]);

  // ── Member filtered notifications ─────────────────────────────────────────
  const displayNotifications = useMemo(() => {
    const myId = currentUser?.id;
    const myMssv = currentUser?.mssv || currentUser?.username;

    const baseList = isDangVien ? notifications : filteredNotifications;

    if (!isDangVien) return baseList;

    return baseList.filter(n => {
      // 1. All-members notifications
      if (n.recipient_type === 'tat_ca') return true;

      // 2. Personal/Targeted notifications containing current user
      if (n.recipients && Array.isArray(n.recipients)) {
        return n.recipients.some(r => r.id === myId || r.mssv === myMssv);
      }
      return false;
    });
  }, [notifications, isDangVien, currentUser, filteredNotifications]);

  // ── Open Form Modal ───────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setPreviewImage('');
    setRecipientType('ca_nhan');
    setUploadedFiles([]);
    setFileList([]);
    setRichContent('');
    form.setFieldsValue({
      created_by: currentUser?.name || 'Chi ủy Chi bộ',
      recipient_type: 'ca_nhan',
      send_email: false,
      sender_email: currentUser?.email || 'chibosinhvien@due.edu.vn',
      sender_phone: currentUser?.phone || currentUser?.sdt || '0935.743.555'
    });
    setIsFormModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.resetFields();
    setPreviewImage(record.image_url || '');
    setRecipientType(record.recipient_type || 'ca_nhan');
    const attachments = record.attachments || [];
    setUploadedFiles(attachments);
    setFileList(attachments.map(att => ({
      uid: att.uid || att.url,
      name: att.filename,
      status: 'done',
      url: att.url
    })));
    // Restore rich content from saved HTML
    setRichContent(record.content || '');
    // Populate form with existing data
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      created_by: record.created_by,
      deadline: record.deadline ? safeDayjs(record.deadline) : undefined,
      image_url: record.image_url || '',
      recipient_type: record.recipient_type,
      send_email: false,
      sender_email: record.sender_email || currentUser?.email || 'chibosinhvien@due.edu.vn',
      sender_phone: record.sender_phone || currentUser?.phone || currentUser?.sdt || '0935.743.555',
      // Pre-populate sub-selects based on saved recipients
      selected_members: record.recipient_type === 'ca_nhan' ? (record.recipients || []).map(r => r.id) : undefined,
    });
    setIsFormModalVisible(true);
  };

  const closeFormModal = () => {
    form.resetFields();
    setPreviewImage('');
    setEditingRecord(null);
    setUploadedFiles([]);
    setFileList([]);
    setRichContent('');
    setIsFormModalVisible(false);
  };

  const handleRecipientTypeChange = (value) => {
    setRecipientType(value);
    form.setFieldsValue({ selected_faculties: undefined, selected_batches: undefined, selected_groups: undefined, selected_members: undefined });
  };

  // ── Resolve Recipients ────────────────────────────────────────────────────
  const resolveRecipients = (values) => {
    const { recipient_type, selected_faculties, selected_batches, selected_groups, selected_members } = values;
    if (recipient_type === 'tat_ca') return members;
    if (recipient_type === 'khoa') return members.filter(m => selected_faculties?.includes(m.khoa));
    if (recipient_type === 'khoa_sinh_vien') return members.filter(m => {
      const b = m.lop ? (m.lop.match(/^(\d{2}[Kk])/) || [])[1]?.toUpperCase() || m.lop.substring(0, 3).toUpperCase() : m.mssv ? m.mssv.substring(0, 2).toUpperCase() + 'K' : null;
      return b && selected_batches?.includes(b);
    });
    if (recipient_type === 'nhom_sinh_hoat') return members.filter(m => selected_groups?.includes(m.nhom));
    if (recipient_type === 'ca_nhan') return members.filter(m => selected_members?.includes(m.id));
    return [];
  };

  // ── Send Email helper ─────────────────────────────────────────────────────
  const doSendEmail = async (title, content, imageUrl, createdBy, deadline, recipientList, senderEmail, senderPhone, attachments = [], emailType = 'both') => {
    const emails = [];
    recipientList.forEach(r => {
      const personal = (r.email || r.email_sv || '').trim(); // Fallback if r.email is actually email_sv
      const school = (r.email_sv || '').trim();
      
      if (emailType === 'personal') {
        const val = r.email ? r.email.trim() : personal;
        if (isValidEmail(val)) emails.push(val);
      } else if (emailType === 'school') {
        if (isValidEmail(school)) emails.push(school);
      } else { // both
        const pVal = r.email ? r.email.trim() : '';
        const sVal = school;
        if (isValidEmail(pVal)) emails.push(pVal);
        if (isValidEmail(sVal) && sVal !== pVal) emails.push(sVal);
        if (!isValidEmail(pVal) && !isValidEmail(sVal) && isValidEmail(personal)) emails.push(personal);
      }
    });

    if (emails.length === 0) {
      message.warning('Không có Đảng viên nào có địa chỉ email hợp lệ!');
      return { sent: 0, failed: 0 };
    }
    const noEmailCount = recipientList.length - emails.length;
    const htmlBody = generateEmailHtml(title, content, imageUrl, createdBy, deadline, senderEmail, senderPhone, attachments);
    
    // Send in batches of 25 emails using BCC to respect SMTP limits and avoid anti-spam blocks
    const batchSize = 25;
    let sentCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      try {
        const response = await fetch(`${API_BASE_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bcc: batch.join(', '), subject: `[Thông báo Chi bộ] ${title}`, html: htmlBody, attachments })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }
        sentCount += batch.length;
      } catch (err) {
        console.error(`Batch send failed for index ${i}:`, err);
        failedCount += batch.length;
        if (err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError')) {
          throw new Error('Server gửi email chưa được khởi động (cổng 5000). Hãy chạy lệnh: cd server && npm start');
        }
        if (sentCount === 0) {
          throw err;
        }
      }
    }

    if (failedCount > 0) {
      message.error(`⚠ Có ${failedCount} email không gửi được do lỗi hệ thống!`, 5);
    } else if (noEmailCount > 0 && noEmailCount !== recipientList.length) {
      message.warning(`⚠ Gửi thành công nhưng có một số Đảng viên không có email hợp lệ, đã bỏ qua.`, 5);
    }
    return { sent: sentCount, failed: failedCount };
  };

  // ── Create / Update Notification ──────────────────────────────────────────
  const handleSave = async () => {
    try {
      // Validate content manually since RichTextEditor is not a Form field
      const htmlContent = richContent?.trim();
      if (!htmlContent || htmlContent === '<br>' || htmlContent === '<p><br></p>') {
        message.warning('Vui lòng nhập nội dung thông báo!');
        return;
      }
      await form.validateFields(['title', 'created_by', 'recipient_type']);
      const values = form.getFieldsValue();
      setSubmitting(true);
      // Use richContent (HTML) as the content
      const content = htmlContent;
      const { title, deadline, image_url, created_by, recipient_type, send_email, email_type, sender_email, sender_phone } = values;

      const resolvedRecipients = resolveRecipients(values);
      if (resolvedRecipients.length === 0) {
        message.warning('Không tìm thấy Đảng viên nào phù hợp!'); setSubmitting(false); return;
      }

      let emailSentCount = 0, emailFailCount = 0, emailEnabled = false;
      if (send_email) {
        emailEnabled = true;
        try {
          const r = await doSendEmail(title, content, image_url, created_by, deadline, resolvedRecipients, sender_email, sender_phone, uploadedFiles, email_type || 'both');
          emailSentCount = r.sent; emailFailCount = r.failed;
        } catch (err) {
          emailFailCount = resolvedRecipients.length;
          message.error(`${err.message}. Thông báo vẫn được lưu.`, 8);
        }
      }

      const payload = {
        title, content,
        created_by,
        deadline: deadline ? safeDayjs(deadline).toISOString() : null,
        image_url: image_url || null,
        recipient_type,
        send_email: emailEnabled,
        email_type: emailEnabled ? (email_type || 'both') : null,
        email_sent_count: emailSentCount,
        email_fail_count: emailFailCount,
        recipients: resolvedRecipients.map(r => ({ id: r.id, mssv: r.mssv, ho_ten: r.ho_ten, email: r.email || '', email_sv: r.email_sv || '' })),
        sender_email: sender_email || null,
        sender_phone: sender_phone || null,
        attachments: uploadedFiles
      };

      if (editingRecord) {
        // ── UPDATE ──
        const { send_email: _, email_sent_count: __, email_fail_count: ___, ...updatePayload } = payload;
        await updateDoc(doc(db, 'notifications', editingRecord.id), {
          ...updatePayload,
          updated_at: new Date().toISOString()
        });
        message.success('✓ Đã cập nhật thông báo thành công!');
      } else {
        // ── CREATE ──
        await addDoc(collection(db, 'notifications'), { ...payload, created_at: new Date().toISOString() });
        if (emailEnabled && emailSentCount > 0) {
          message.success(`✓ Đã đăng thông báo và gửi email đến ${emailSentCount} Đảng viên!`, 5);
        } else {
          message.success('✓ Đã đăng thông báo thành công!');
        }
      }

      closeFormModal(); fetchNotifications();
    } catch (e) {
      if (e?.errorFields) return;
      message.error('Lỗi: ' + e.message);
    } finally { setSubmitting(false); }
  };

  // ── Send Email to existing notification ───────────────────────────────────
  const handleSendEmailNow = async () => {
    if (!sendEmailTarget) return;
    setSendingEmail(true);
    try {
      const { title, content, image_url, created_by, deadline, recipients, sender_email, sender_phone, attachments } = sendEmailTarget;
      const result = await doSendEmail(title, content, image_url, created_by, deadline, recipients || [], sender_email, sender_phone, attachments || [], sendEmailType);

      // Update Firestore document with new email counts
      await updateDoc(doc(db, 'notifications', sendEmailTarget.id), {
        send_email: true,
        email_sent_count: result.sent,
        email_fail_count: result.failed,
        updated_at: new Date().toISOString()
      });

      message.success(`✓ Đã gửi email đến ${result.sent} Đảng viên!`, 5);
      setIsSendEmailModalVisible(false); setSendEmailTarget(null);
      fetchNotifications();
    } catch (err) { message.error(`Lỗi: ${err.message}`, 8); }
    finally { setSendingEmail(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try { await deleteDoc(doc(db, 'notifications', id)); message.success('Đã xóa!'); fetchNotifications(); }
    catch (e) { message.error('Lỗi khi xóa'); }
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: 'Xác nhận xóa thông báo?',
      content: 'Hành động này sẽ xóa vĩnh viễn thông báo này khỏi hệ thống.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setIsDetailVisible(false);
        await handleDelete(record.id);
      }
    });
  };

  const handleSendEmailFromDetail = (record) => {
    setIsDetailVisible(false);
    setSendEmailTarget(record);
    setIsSendEmailModalVisible(true);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getRecipientTypeTag = (type) => {
    const map = { tat_ca: ['red', 'Tất cả'], khoa: ['blue', 'Theo khoa'], khoa_sinh_vien: ['orange', 'Theo khóa'], nhom_sinh_hoat: ['purple', 'Theo nhóm'], ca_nhan: ['green', 'Cá nhân'] };
    const [color, label] = map[type] || ['default', type];
    return <Tag color={color}>{label}</Tag>;
  };

  const getEmailStatusBadge = (record) => {
    if (!record.send_email) return <span style={{ color: '#bfbfbf', fontSize: 12 }}><StopOutlined style={{ marginRight: 4 }} />Chưa gửi</span>;
    const sent = record.email_sent_count || 0;
    if (sent > 0) return <span style={{ color: '#52c41a', fontSize: 12, fontWeight: 600 }}><CheckCircleOutlined style={{ marginRight: 4 }} />Đã gửi ({sent})</span>;
    if (record.email_fail_count > 0) return <span style={{ color: '#ff4d4f', fontSize: 12 }}><StopOutlined style={{ marginRight: 4 }} />Lỗi gửi</span>;
    return <span style={{ color: '#faad14', fontSize: 12 }}><MailOutlined style={{ marginRight: 4 }} />Không có email</span>;
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      title: 'Ngày', dataIndex: 'created_at', key: 'created_at', width: 110,
      render: d => <span style={{ fontSize: 12, color: '#595959' }}>{safeDayjs(d).format('DD/MM/YY HH:mm')}</span>
    },
    {
      title: 'Tiêu đề & Người phát hành', key: 'info',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 800, color: '#262626', marginBottom: 2 }}>{r.title}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            <UserOutlined style={{ marginRight: 4 }} />{r.created_by}
            {r.updated_at && <span style={{ marginLeft: 8, color: '#bfbfbf', fontStyle: 'italic' }}>(đã sửa)</span>}
          </div>
        </div>
      )
    },
    {
      title: 'Đối tượng', key: 'recipient_info', width: 130,
      render: (_, r) => (
        <div>
          {getRecipientTypeTag(r.recipient_type)}
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 3 }}>{(r.recipients || []).length} Đảng viên</div>
        </div>
      )
    },
    {
      title: 'Email', key: 'email_status', width: 120,
      render: (_, record) => getEmailStatusBadge(record)
    },
    {
      title: 'Hạn p/h', dataIndex: 'deadline', key: 'deadline', width: 110,
      render: dl => dl ? <Tag color="volcano" style={{ fontSize: 11 }}>{safeDayjs(dl).format('DD/MM HH:mm')}</Tag> : <span style={{ color: '#bfbfbf' }}>–</span>
    },
    {
      title: 'Thao tác', key: 'action', width: 130,
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" type="text" icon={<EyeOutlined style={{ color: '#096dd9' }} />}
              onClick={() => { setDetailRecord(record); setIsDetailVisible(true); }} />
          </Tooltip>
          <PermissionWrapper module="notifications" action="edit" fallback="hide">
            <Tooltip title="Chỉnh sửa">
              <Button size="small" type="text" icon={<EditOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => openEditModal(record)} />
            </Tooltip>
          </PermissionWrapper>
          <PermissionWrapper module="notifications" action="edit" fallback="hide">
            <Tooltip title="Gửi Email ngay">
              <Button size="small" type="text" icon={<MailOutlined style={{ color: '#c62828' }} />}
                onClick={() => { setSendEmailTarget(record); setIsSendEmailModalVisible(true); }} />
            </Tooltip>
          </PermissionWrapper>
          <PermissionWrapper module="notifications" action="delete" fallback="hide">
            <Tooltip title="Xóa">
              <Popconfirm title="Xóa thông báo này?" onConfirm={() => handleDelete(record.id)} okButtonProps={{ danger: true }}>
                <Button size="small" type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          </PermissionWrapper>
        </Space>
      )
    }
  ];

  // ── Recipient sub-selects ─────────────────────────────────────────────────
  const renderRecipientSubField = () => {
    if (recipientType === 'khoa') return (
      <Form.Item name="selected_faculties" label={<b>Chọn Khoa</b>} style={{ marginBottom: 10 }}>
        <Select mode="multiple" placeholder="Chọn các Khoa..." showSearch style={{ width: '100%' }}>
          {uniqueFaculties.map(k => <Option key={k} value={k}>{k}</Option>)}
        </Select>
      </Form.Item>
    );
    if (recipientType === 'khoa_sinh_vien') return (
      <Form.Item name="selected_batches" label={<b>Chọn Khóa</b>} style={{ marginBottom: 10 }}>
        <Select mode="multiple" placeholder="VD: 48K, 49K..." style={{ width: '100%' }}>
          {uniqueBatches.map(b => <Option key={b} value={b}>{b}</Option>)}
        </Select>
      </Form.Item>
    );
    if (recipientType === 'nhom_sinh_hoat') return (
      <Form.Item name="selected_groups" label={<b>Chọn Nhóm</b>} style={{ marginBottom: 10 }}>
        <Select mode="multiple" placeholder="Chọn các Nhóm..." style={{ width: '100%' }}>
          {uniqueGroups.map(g => <Option key={g} value={g}>{g}</Option>)}
        </Select>
      </Form.Item>
    );
    if (recipientType === 'ca_nhan') return (
      <Form.Item name="selected_members" label={<b>Chọn Đảng viên</b>} style={{ marginBottom: 10 }}>
        <Select mode="multiple" placeholder="Nhập tên hoặc MSSV..." optionFilterProp="children" showSearch style={{ width: '100%' }}>
          {members.map(m => <Option key={m.id} value={m.id}>{m.ho_ten} – {m.mssv} ({m.lop})</Option>)}
        </Select>
      </Form.Item>
    );
    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <Title level={3} style={{ marginBottom: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '4px', height: '22px', backgroundColor: '#c62828', borderRadius: '2px' }} />
        {isDangVien ? 'Thông báo Chi bộ' : 'Quản lý Thông báo Chi bộ'}
      </Title>

      {/* ── MEMBER VIEW ── */}
      {isDangVien && (
        loading ? <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
          : displayNotifications.length === 0 ? <Empty description="Chưa có thông báo nào" style={{ padding: '60px 0' }} />
            : (
              <Row gutter={[20, 20]}>
                {displayNotifications.map(record => (
                  <Col xs={24} sm={12} lg={8} key={record.id}>
                    <Card hoverable bordered={false}
                      onClick={() => { setDetailRecord(record); setIsDetailVisible(true); }}
                      style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', height: '100%', cursor: 'pointer', overflow: 'hidden' }}
                      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                      <div style={{ background: 'linear-gradient(135deg, #c62828 0%, #ad1457 100%)', padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                          <NotificationOutlined style={{ marginRight: 4 }} /> Thông báo Chi bộ
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#fff', textTransform: 'uppercase', lineHeight: 1.4 }}>{record.title}</div>
                      </div>
                      <div style={{ padding: '14px 16px 10px', flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
                          <CalendarOutlined style={{ color: '#c62828', marginRight: 6 }} />
                          <span style={{ fontWeight: 600 }}>Ngày đăng:</span> {safeDayjs(record.created_at).format('HH:mm - DD/MM/YYYY')}
                        </div>
                        {record.deadline && (
                          <div style={{ fontSize: 12, color: '#cf1322', marginBottom: 6 }}>
                            <ClockCircleOutlined style={{ marginRight: 6 }} />
                            <span style={{ fontWeight: 600 }}>Hạn phản hồi:</span> {safeDayjs(record.deadline).format('HH:mm - DD/MM/YYYY')}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {stripHtml(record.content)}
                        </div>
                      </div>
                      <div style={{ padding: '8px 16px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}><UserOutlined style={{ marginRight: 4 }} />{record.created_by}</div>
                        <span style={{ fontSize: 11, color: '#c62828', fontWeight: 700 }}>Xem chi tiết →</span>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
      )}

      {/* ── MANAGER VIEW ── */}
      {!isDangVien && (
        <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          {/* Filter Bar */}
          <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
            <Col flex="1">
              <Input prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Tìm theo tiêu đề, người phát hành..."
                value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
                allowClear style={{ borderRadius: 8 }} />
            </Col>
            <Col>
              <Select placeholder="Lọc theo loại nhận" value={filterType || undefined}
                onChange={v => setFilterType(v || '')} allowClear style={{ width: 180, borderRadius: 8 }}>
                <Option value="tat_ca">Tất cả Đảng viên</Option>
                <Option value="khoa">Theo khoa</Option>
                <Option value="khoa_sinh_vien">Theo khóa</Option>
                <Option value="nhom_sinh_hoat">Theo nhóm</Option>
                <Option value="ca_nhan">Cá nhân</Option>
              </Select>
            </Col>
            <Col>
              <DatePicker.RangePicker
                placeholder={['Từ ngày', 'Đến ngày']}
                value={filterDateRange}
                onChange={val => setFilterDateRange(val)}
                format="DD/MM/YYYY"
                style={{ borderRadius: 8, width: 240 }}
                allowClear
              />
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchNotifications} loading={loading} style={{ borderRadius: 8 }} />
            </Col>
            <Col>
              <PermissionWrapper module="notifications" action="create">
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}
                  style={{ backgroundColor: '#c62828', borderColor: '#c62828', height: 36, borderRadius: 8, fontWeight: 700 }}>
                  Soạn Thông báo Mới
                </Button>
              </PermissionWrapper>
            </Col>
          </Row>

          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
            Hiển thị <strong>{filteredNotifications.length}</strong> / {notifications.length} thông báo
          </div>

          <Table
            columns={tableColumns}
            dataSource={filteredNotifications}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 8, size: 'small' }}
            size="middle"
            onRow={(record) => ({
              onClick: (event) => {
                // Skip if clicked on any interactive elements (buttons, menus, popconfirm)
                if (event.target.closest('.ant-btn') || event.target.closest('.ant-space') || event.target.closest('.ant-popconfirm')) {
                  return;
                }
                setDetailRecord(record);
                setIsDetailVisible(true);
              },
              style: { cursor: 'pointer' }
            })}
          />
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal Soạn / Chỉnh sửa Thông báo
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editingRecord ? <EditOutlined style={{ color: '#fa8c16', fontSize: 18 }} /> : <SendOutlined style={{ color: '#c62828', fontSize: 18 }} />}
          <span style={{ fontWeight: 800, fontSize: 16 }}>
            {editingRecord ? 'Chỉnh sửa Thông báo' : 'Soạn & Phát hành Thông báo Chi bộ'}
          </span>
        </div>}
        open={isFormModalVisible}
        onCancel={closeFormModal}
        width={1140}
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={20}>
            {/* ── LEFT: Form Inputs ─────────────────────────────────────────── */}
            <Col xs={24} md={11} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>📝 Nội dung</div>

              <Form.Item name="title" label={<b>Tiêu đề thông báo</b>} rules={[{ required: true, message: 'Nhập tiêu đề!' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="Tiêu đề chính thức..." maxLength={120} showCount />
              </Form.Item>

              <Form.Item name="content" label={<b>Nội dung</b>} rules={[{ required: false }]} style={{ marginBottom: 12 }}>
                <div>
                  <RichTextEditor
                    value={richContent}
                    onChange={(html) => {
                      setRichContent(html);
                      form.setFieldsValue({ content: html });
                    }}
                    placeholder="Nhập nội dung thông báo... (hỗ trợ định dạng đậm, nghiêng, link, danh sách...)"
                    minHeight={160}
                  />
                  {(!richContent || richContent === '<br>' || richContent === '<p><br></p>') && (
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 3 }}>Vui lòng nhập nội dung!</div>
                  )}
                </div>
              </Form.Item>

              <Row gutter={10}>
                <Col span={12}>
                  <Form.Item name="created_by" label={<b>Người phát hành</b>} rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <Input placeholder="Ban Chấp hành Chi bộ" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="deadline" label={<b>Hạn chót phản hồi</b>} style={{ marginBottom: 12 }}>
                    <DatePicker showTime format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} placeholder="Không bắt buộc" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={10}>
                <Col span={12}>
                  <Form.Item name="sender_email" label={<b>Email liên hệ thắc mắc</b>} rules={[{ type: 'email', message: 'Email không hợp lệ!' }]} style={{ marginBottom: 12 }}>
                    <Input placeholder="chibosinhvien@due.edu.vn" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="sender_phone" label={<b>Số điện thoại liên hệ</b>} style={{ marginBottom: 12 }}>
                    <Input placeholder="0935.743.555" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="image_url" label={<b>Ảnh đính kèm</b>} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Upload beforeUpload={handleImageUpload} showUploadList={false} accept="image/*" disabled={imageUploading}>
                    <Button icon={<UploadOutlined />} size="small" loading={imageUploading}>
                      {imageUploading ? `Đang tải... (${imageProgress}%)` : 'Chọn ảnh'}
                    </Button>
                  </Upload>
                  {previewImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={previewImage} alt="preview" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }} />
                      <Button size="small" danger onClick={() => { setPreviewImage(''); form.setFieldsValue({ image_url: '' }); }} icon={<DeleteOutlined />}>Xóa</Button>
                    </div>
                  )}
                </div>
              </Form.Item>

              <Form.Item label={<b>Tài liệu đính kèm (PDF, Word, Excel...)</b>} style={{ marginBottom: 12 }}>
                <Upload
                  customRequest={handleCustomFileUpload}
                  onChange={handleFileChange}
                  fileList={fileList}
                  beforeUpload={beforeFileUpload}
                >
                  <Button icon={<UploadOutlined />} size="small">Chọn tệp tin</Button>
                </Upload>
              </Form.Item>

              <Divider style={{ margin: '4px 0 12px' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                <FilterOutlined style={{ marginRight: 4 }} />Đối tượng nhận
              </div>

              <Form.Item name="recipient_type" label={<b>Loại người nhận</b>} rules={[{ required: true }]} style={{ marginBottom: 10 }}>
                <Select onChange={handleRecipientTypeChange}>
                  <Option value="tat_ca">Tất cả Đảng viên đang sinh hoạt</Option>
                  <Option value="khoa">Theo khoa chuyên môn</Option>
                  <Option value="khoa_sinh_vien">Theo khóa học</Option>
                  <Option value="nhom_sinh_hoat">Theo nhóm sinh hoạt</Option>
                  <Option value="ca_nhan">Cá nhân (chọn từng người)</Option>
                </Select>
              </Form.Item>

              {renderRecipientSubField()}

              {/* Send email switch - only for new notifications */}
              {!editingRecord && (
                <div style={{ padding: '10px 14px', background: '#f8f8f8', borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: watchedSendEmail ? 10 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <MailOutlined style={{ color: '#c62828' }} /> Đồng thời gửi Email
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>Tự động gửi email đến Đảng viên được nhận</div>
                    </div>
                    <Form.Item name="send_email" valuePropName="checked" noStyle>
                      <Switch checkedChildren="Gửi Email" unCheckedChildren="Không gửi" />
                    </Form.Item>
                  </div>
                  {watchedSendEmail && (
                    <Form.Item name="email_type" label={<b>Chọn loại email nhận</b>} initialValue="both" style={{ marginBottom: 0, marginTop: 8 }}>
                      <Select style={{ width: '100%' }}>
                        <Option value="both">Gửi cả 2 email (Cá nhân & Sinh viên)</Option>
                        <Option value="personal">Chỉ gửi Email Cá nhân (email)</Option>
                        <Option value="school">Chỉ gửi Email Sinh viên (email_sv)</Option>
                      </Select>
                    </Form.Item>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: editingRecord ? 16 : 0 }}>
                <Button onClick={closeFormModal} style={{ borderRadius: 6, height: 38 }}>Hủy</Button>
                <Button type="primary" onClick={handleSave} loading={submitting}
                  icon={editingRecord ? <EditOutlined /> : <SendOutlined />}
                  style={{ backgroundColor: editingRecord ? '#fa8c16' : '#c62828', borderColor: editingRecord ? '#fa8c16' : '#c62828', height: 38, borderRadius: 6, fontWeight: 700, minWidth: 160 }}>
                  {submitting ? 'Đang lưu...' : (editingRecord ? 'Lưu thay đổi' : 'Phát hành Thông báo')}
                </Button>
              </div>
            </Col>

            {/* ── RIGHT: Live Email Preview ─────────────────────────────────── */}
            <Col xs={24} md={13} style={{ paddingLeft: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <MailOutlined style={{ marginRight: 6, color: '#c62828' }} />Xem trước Email (Cập nhật tự động)
                </div>
                <span style={{ background: '#52c41a', color: '#fff', padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>LIVE</span>
              </div>

              <div style={{ background: '#e8eaf0', borderRadius: 10, padding: 10, border: '1px solid #dde1ee', maxHeight: 540, overflowY: 'auto' }}>
                <div style={{ background: '#fff', borderRadius: '6px 6px 0 0', padding: '8px 12px', borderBottom: '1px solid #e8e8e8', fontSize: 11, color: '#595959' }}>
                  <div style={{ marginBottom: 2 }}><strong>Từ:</strong> Chi bộ Sinh viên &lt;noreply@chibo.edu.vn&gt;</div>
                  <div style={{ marginBottom: 2 }}><strong>Đến:</strong> {recipientType === 'tat_ca' ? `Tất cả ${members.length} Đảng viên` : '(Đảng viên đã chọn)'}</div>
                  <div><strong>Tiêu đề:</strong> [Thông báo Chi bộ] {watchedTitle || '(Chưa nhập tiêu đề)'}</div>
                </div>
                <div style={{ borderRadius: '0 0 6px 6px', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: livePreviewHtml }} />
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal Gửi Email cho thông báo cũ
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined style={{ color: '#c62828' }} />
          <span style={{ fontWeight: 800 }}>Gửi Email thông báo</span>
        </div>}
        open={isSendEmailModalVisible}
        onCancel={() => { setIsSendEmailModalVisible(false); setSendEmailTarget(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setIsSendEmailModalVisible(false); setSendEmailTarget(null); }}>Hủy</Button>,
          <Button key="send" type="primary" loading={sendingEmail} icon={<SendOutlined />} onClick={handleSendEmailNow}
            style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700 }}>
            Xác nhận Gửi Email
          </Button>
        ]}
        width={520}
      >
        {sendEmailTarget && (
          <div>
            <Alert type="info" showIcon
              message={<span>Sẽ gửi email đến <strong>{(sendEmailTarget.recipients || []).filter(r => r.email).length}</strong> Đảng viên có email (tổng <strong>{(sendEmailTarget.recipients || []).length}</strong> người nhận).</span>}
              style={{ marginBottom: 16, borderRadius: 8 }} />
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ marginBottom: 8 }}><b>Tiêu đề:</b> {sendEmailTarget.title}</div>
              <div style={{ marginBottom: 8 }}><b>Người phát hành:</b> {sendEmailTarget.created_by}</div>
              <div><b>Đối tượng:</b> {getRecipientTypeTag(sendEmailTarget.recipient_type)} ({(sendEmailTarget.recipients || []).length} Đảng viên)</div>
            </div>
            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <span style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Chọn loại email nhận:</span>
              <Select value={sendEmailType} onChange={setSendEmailType} style={{ width: '100%' }}>
                <Option value="both">Gửi cả 2 email (Cá nhân & Sinh viên)</Option>
                <Option value="personal">Chỉ gửi Email Cá nhân (email)</Option>
                <Option value="school">Chỉ gửi Email Sinh viên (email_sv)</Option>
              </Select>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          Detail Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={isDetailVisible} onCancel={() => setIsDetailVisible(false)}
        footer={!isDangVien ? [
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete(detailRecord)}
            style={{ float: 'left' }}
          >
            Xóa thông báo
          </Button>,
          <Button
            key="send"
            type="primary"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
            icon={<MailOutlined />}
            onClick={() => handleSendEmailFromDetail(detailRecord)}
          >
            Gửi Email
          </Button>,
          <Button key="edit" icon={<EditOutlined />} onClick={() => { setIsDetailVisible(false); openEditModal(detailRecord); }}
            style={{ fontWeight: 700 }}>Chỉnh sửa</Button>,
          <Button key="close" onClick={() => setIsDetailVisible(false)}>Đóng</Button>
        ] : null}
        width={700} bodyStyle={{ padding: 0 }}>
        {detailRecord && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)', padding: '24px 28px', borderRadius: '8px 8px 0 0' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                <NotificationOutlined style={{ marginRight: 6 }} /> Thông báo phát hành Chi bộ
              </div>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', textTransform: 'uppercase', lineHeight: 1.4 }}>{detailRecord.title}</div>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 20, padding: '14px 18px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Người phát hành</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><UserOutlined style={{ marginRight: 5, color: '#c62828' }} />{detailRecord.created_by}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Ngày phát hành</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><CalendarOutlined style={{ marginRight: 5, color: '#c62828' }} />{safeDayjs(detailRecord.created_at).format('HH:mm - DD/MM/YYYY')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Hạn phản hồi</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: detailRecord.deadline ? '#cf1322' : '#bfbfbf' }}>
                    <ClockCircleOutlined style={{ marginRight: 5 }} />
                    {detailRecord.deadline ? safeDayjs(detailRecord.deadline).format('HH:mm - DD/MM/YYYY') : 'Không có hạn chót'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Trạng thái Email</div>
                  <div style={{ fontSize: 13 }}>{getEmailStatusBadge(detailRecord)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Đối tượng nhận</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{getRecipientTypeTag(detailRecord.recipient_type)} <span style={{ color: '#595959' }}>({(detailRecord.recipients || []).length} Đảng viên)</span></div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, borderBottom: '2px solid #c62828', paddingBottom: 5, display: 'inline-block' }}>Nội dung thông báo</div>
                <div style={{ lineHeight: 2, fontSize: 14, textAlign: 'justify', color: '#333', margin: 0 }} dangerouslySetInnerHTML={{ __html: detailRecord.content }} />
              </div>

              {detailRecord.image_url && (
                <div style={{ marginBottom: 20, textAlign: 'center', padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                  <img src={detailRecord.image_url} alt="Đính kèm" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }} />
                </div>
              )}

              {detailRecord.attachments && detailRecord.attachments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, borderBottom: '2px solid #c62828', paddingBottom: 5, display: 'inline-block' }}>Tài liệu đính kèm</div>
                  <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#333' }}>
                      {detailRecord.attachments.map((att, idx) => (
                        <li key={idx} style={{ marginBottom: 6 }}>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: '#096dd9', textDecoration: 'underline', fontWeight: 600 }}>
                            {att.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!isDangVien && (detailRecord.recipients || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, borderBottom: '2px solid #c62828', paddingBottom: 5, display: 'inline-block' }}>
                    <TeamOutlined style={{ marginRight: 4 }} /> Danh sách nhận ({(detailRecord.recipients || []).length} Đảng viên)
                  </div>
                  <div style={{ maxHeight: 140, overflowY: 'auto', padding: 10, background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                    <Space size={[6, 6]} wrap>
                      {(detailRecord.recipients || []).map((r, i) => (
                        <Tag key={i} style={{ margin: 0, fontWeight: 500 }}>
                          {r.ho_ten} ({r.mssv})
                          {r.email ? <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} /> : null}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ThongBao;
