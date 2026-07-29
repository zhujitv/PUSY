export type NotificationChannel = "email" | "sms";

export type NotificationSetting = {
  channel: NotificationChannel;
  display_name: string;
  enabled: number;
  provider: string;
  sender_name: string;
  sender_address: string;
};

export type NotificationTemplate = {
  key: string;
  name: string;
  email_subject: string;
  email_body: string;
  sms_body: string;
  enabled: number;
};

export type NotificationJob = {
  id: string;
  event_key: string;
  entity_type: string;
  entity_id: string;
  template_key: string;
  channel: NotificationChannel;
  recipient: string;
  payload_json: string;
  status: string;
  attempts: number;
  scheduled_at: string;
};

