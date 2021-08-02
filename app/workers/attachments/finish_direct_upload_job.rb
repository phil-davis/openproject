#-- encoding: UTF-8

#-- copyright
# OpenProject is an open source project management software.
# Copyright (C) 2012-2021 the OpenProject GmbH
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See docs/COPYRIGHT.rdoc for more details.
#++

class Attachments::FinishDirectUploadJob < ApplicationJob
  queue_with_priority :high

  def perform(attachment_id)
    attachment = Attachment.pending_direct_uploads.find_by(id: attachment_id)
    # An attachment is guaranteed to have a file.
    # But if the attachment is nil the expression attachment&.file will be nil and attachment&.file.local_file
    # will throw a NoMethodError: undefined method local_file' for nil:NilClass`.
    local_file = attachment && attachment.file.local_file

    if local_file.nil?
      return Rails.logger.error("File for attachment #{attachment_id} was not uploaded.")
    end

    begin
      set_attributes_from_file(attachment, local_file)
      save_attachment(attachment)
      journalize_container(attachment)
      attachment_created_event(attachment)
    ensure
      File.unlink(local_file.path) if File.exist?(local_file.path)
    end
  end

  private

  def set_attributes_from_file(attachment, local_file)
    attachment.downloads = 0
    attachment.set_file_size local_file
    attachment.set_content_type local_file
    attachment.set_digest local_file
  end

  def save_attachment(attachment)
    User.execute_as(attachment.author) do
      attachment.save! if attachment.changed?
    end
  end

  def journalize_container(attachment)
    journable = attachment.container

    return unless journable&.class&.journaled?

    # Touching the journable will lead to the journal created next having its own timestamp.
    # That timestamp will not adequately reflect the time the attachment was uploaded. This job
    # right here might be executed way later than the time the attachment was uploaded. Ideally,
    # the journals would be created bearing the time stamps of the attachment's created_at.
    # This remains a TODO.
    # But with the timestamp update in place as it is, at least the collapsing of aggregated journals
    # from days before with the newly uploaded attachment is prevented.
    touch_journable(journable)

    Journals::CreateService
      .new(journable, attachment.author)
      .call
  end

  def touch_journable(journable)
    # Not using touch here on purpose,
    # as to avoid changing lock versions on the journables for this change
    attributes = journable.send(:timestamp_attributes_for_update_in_model)

    timestamps = attributes.index_with { Time.now }
    journable.update_columns(timestamps) if timestamps.any?
  end

  def attachment_created_event(attachment)
    OpenProject::Notifications.send(
      OpenProject::Events::ATTACHMENT_CREATED,
      attachment: attachment
    )
  end
end
